import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { Workflow, WorkflowDetail, Task } from '../../types';
import api from '../../api';
import yaml from 'yaml';
import { Graph, Node as X6Node } from '@antv/x6';
import { compileGraph } from '../../utils/graphUtils';

interface Project {
  code: number;
  name: string;
}

interface HomeState {
  workflows: Workflow[];
  loading: boolean;
  error: string | null;
  projects: Project[];
  selectedProject: string | null;
  isRestoreModalOpen: boolean;
  isBackfillModalOpen: boolean;
  selectedWorkflow: Workflow | null;
}

const initialState: HomeState = {
  workflows: [],
  loading: true,
  error: null,
  projects: [],
  selectedProject: null,
  isRestoreModalOpen: false,
  isBackfillModalOpen: false,
  selectedWorkflow: null,
};

export const homeSlice = createSlice({
  name: 'home',
  initialState,
  reducers: {
    setWorkflows: (state, action: PayloadAction<Workflow[]>) => {
      state.workflows = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setProjects: (state, action: PayloadAction<Project[]>) => {
      state.projects = action.payload;
    },
    setSelectedProject: (state, action: PayloadAction<string | null>) => {
      state.selectedProject = action.payload;
    },
    setIsRestoreModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isRestoreModalOpen = action.payload;
    },
    setIsBackfillModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isBackfillModalOpen = action.payload;
    },
    setSelectedWorkflow: (state, action: PayloadAction<Workflow | null>) => {
      state.selectedWorkflow = action.payload;
    },
  },
});

export const {
  setWorkflows,
  setLoading,
  setError,
  setProjects,
  setSelectedProject,
  setIsRestoreModalOpen,
  setIsBackfillModalOpen,
  setSelectedWorkflow,
} = homeSlice.actions;

export const fetchProjects = createAsyncThunk(
  'home/fetchProjects',
  async (_, { dispatch }) => {
    try {
      const projects = await api.get<Project[]>('/api/projects');
      dispatch(setProjects(projects));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      dispatch(setError(errorMessage));
    }
  }
);

export const fetchWorkflows = createAsyncThunk(
  'home/fetchWorkflows',
  async (_, { dispatch }) => {
    dispatch(setLoading(true));
    dispatch(setError(null));
    try {
      const combinedWorkflows = await api.get<Workflow[]>('/api/workflow/combined');
      dispatch(setWorkflows(combinedWorkflows));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      dispatch(setError(errorMessage));
    } finally {
      dispatch(setLoading(false));
    }
  }
);

export const deleteWorkflow = createAsyncThunk(
  'home/deleteWorkflow',
  async (record: Workflow, { dispatch }) => {
    try {
      const params: { projectCode?: number; workflowCode?: number } = {};
      if (record.projectCode && typeof record.code === 'number') {
        params.projectCode = record.projectCode;
        params.workflowCode = record.code;
      }

      await api.delete(`/api/workflow/${record.uuid}`, params);
      dispatch(fetchWorkflows());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      throw new Error(errorMessage);
    }
  }
);

export const onlineWorkflow = createAsyncThunk(
  'home/onlineWorkflow',
  async (record: Workflow, { dispatch }) => {
    try {
      // 1. Fetch the full YAML content and workflow details
      const workflowDetail = await api.get<WorkflowDetail>(`/api/workflow/${record.uuid}`);
      const yamlContent = workflowDetail.yaml_content;
      const doc = yaml.parse(yamlContent);
      const workflow = doc.workflow || {};
      
      // Create a temporary graph instance to compile the workflow
      const tempGraph = new Graph({ container: document.createElement('div') });
      const originalTasks = doc.tasks || [];

      // Pre-process DIY_FUNCTION tasks
      const diyFunctionPromises = originalTasks
        .filter((task: any) => task.type === 'DIY_FUNCTION')
        .map(async (task: any) => {
          const functionId = task.task_params?.functionId;
          if (functionId) {
            try {
              const funcData = await api.get<any>(`/api/diy-functions/${functionId}`);
              // Mutate the task object in place
              task.command = funcData.functionContent;
              task.type = 'PYTHON'; 
              task.task_type = 'PYTHON';
            } catch (e) {
              console.error(`Failed to fetch DIY function ${functionId}`, e);
              // Stop the process if a function can't be fetched
              throw new Error(`Failed to fetch code for custom component with ID ${functionId}.`);
            }
          }
        });

      // Wait for all DIY functions to be processed
      await Promise.all(diyFunctionPromises);

      const relations: { from: string, to: string }[] = [];
      for (const task of originalTasks) {
        if (task.deps) {
          for (const dep of task.deps) {
            relations.push({ from: dep, to: task.name });
          }
        }
      }
      const nodes = originalTasks.map((task: any) => tempGraph.createNode({ shape: 'task-node', id: task.name, data: task }));
      const edges = relations.map(rel => {
        const sourceNode = nodes.find((n: X6Node) => n.getData().name === rel.from);
        const targetNode = nodes.find((n: X6Node) => n.getData().name === rel.to);
        if (sourceNode && targetNode) {
          return tempGraph.createEdge({ source: sourceNode.id, target: targetNode.id });
        }
        return null;
      }).filter(Boolean);
      
      tempGraph.resetCells([...nodes, ...edges as any]);

      // 2. COMPILE the graph
      const { tasks } = compileGraph(tempGraph);

      // 3. Generate task codes
      const taskNameToCodeMap = new Map<string, number>();
      const baseCode = Date.now();
      tasks.forEach((task: Task, index: number) => {
        const taskCode = baseCode + index;
        taskNameToCodeMap.set(task.name, taskCode);
      });

      // 4. Build taskDefinitionJson from the COMPILED tasks
      const taskDefinitionJson = tasks.map((task: Task) => {
        const taskCode = taskNameToCodeMap.get(task.name);
        const originalTask = originalTasks.find((t: any) => t.name === task.name);
        const originalTaskParams = originalTask?.task_params || {};
        const failRetryTimes = originalTaskParams?.failRetryTimes ?? 0;
        const failRetryInterval = originalTaskParams?.failRetryInterval ?? 1;

        let taskParams: Record<string, any>;
        let taskType = (task.type || 'SHELL').toUpperCase();

        if (task.type === 'SQL') {
          const params = { ...originalTaskParams, ...(task.task_params || {}) };
          taskParams = {
            type: params.datasourceType,
            datasource: params.datasource,
            sql: params.sql,
            sqlType: params.sqlType,
            preStatements: params.preStatements ? (params.preStatements as string).split(';').filter((s: string) => s.trim() !== '') : [],
            postStatements: params.postStatements ? (params.postStatements as string).split(';').filter((s: string) => s.trim() !== '') : [],
            displayRows: params.displayRows,
            localParams: originalTaskParams.localParams || [],
            resourceList: [],
          };
        } else if (task.type === 'SWITCH') {
          const params = { ...originalTaskParams, ...(task.task_params || {}) };
          const dependTaskList = (params.switchResult?.dependTaskList || []).map((item: any) => ({
            ...item,
            nextNode: taskNameToCodeMap.get(item.nextNode),
          }));
          const nextNode = params.switchResult?.nextNode ? taskNameToCodeMap.get(params.switchResult.nextNode) : undefined;
          
          taskParams = {
            localParams: originalTaskParams.localParams || [],
            switchResult: {
              dependTaskList: dependTaskList,
              nextNode: nextNode,
            },
            rawScript: '',
          };
        } else if (task.type === 'HTTP') {
          taskParams = {
            ...originalTaskParams,
            ...(task.task_params || {}),
          };
        } else if (task.type === 'CONDITIONS') {
          const params = { ...originalTaskParams, ...(task.task_params || {}) };
          const successNode = (params.dependence?.dependTaskList?.[0]?.conditionResult?.successNode || []).map((name: string) => taskNameToCodeMap.get(name));
          const failedNode = (params.dependence?.dependTaskList?.[0]?.conditionResult?.failedNode || []).map((name: string) => taskNameToCodeMap.get(name));

          taskParams = {
            localParams: originalTaskParams.localParams || [],
            dependence: {
              relation: "AND",
              dependTaskList: []
            },
            conditionResult: {
              successNode: successNode,
              failedNode: failedNode
            },
          };
        } else if (task.type === 'DEPENDENT') {
          const params = { ...originalTaskParams, ...(task.task_params || {}) };
          taskParams = {
            dependence: params.denpendence, // Correctly pass the object
            localParams: params.localParams || [],
            resourceList: [],
          };
        } else if (task.type === 'SUB_PROCESS') {
          const localParams = originalTaskParams.localParams || [];
          taskParams = {
            localParams: localParams,
            resourceList: [],
            processDefinitionCode: task.task_params?.processDefinitionCode || 0,
          };
        } else if (task.type === 'PROCEDURE') { 
          const params = { ...originalTaskParams, ...(task.task_params || {}) };
          const localParams = originalTaskParams.localParams || [];
          taskParams = {
            type: params.datasourceType,
            datasource: params.datasource,
            method: params.method,
            localParams,
            resourceList: [],
          };
        } else {
          const rawScript = task.command || task.task_params?.rawScript || '';
          const localParams = originalTaskParams.localParams || [];
          taskParams = {
            rawScript: rawScript,
            localParams: localParams,
            resourceList: [],
          };
        }

        return {
          code: taskCode,
          name: task.name,
          description: task.description || '',
          taskType: taskType,
          taskParams: taskParams,
          failRetryTimes: failRetryTimes,
          failRetryInterval: failRetryInterval,
          timeoutFlag: 'CLOSE',
          timeoutNotifyStrategy: '',
          timeout: 0,
          delayTime: 0,
          environmentCode: -1,
          flag: 'YES',
          isCache: 'NO',
          taskPriority: 'MEDIUM',
          workerGroup: 'default',
          cpuQuota: -1,
          memoryMax: -1,
          taskExecuteType: 'BATCH'
        };
      });

      // 5. Build taskRelationJson and locations from COMPILED relations
      const taskRelationJson: any[] = [];
      const originalLocations = workflowDetail.locations ? JSON.parse(workflowDetail.locations) : [];
      const originalLocationsMap = new Map(originalLocations.map((l: any) => [l.taskCode, { x: l.x, y: l.y }]));
      const payloadLocations: any[] = [];

      tasks.forEach((task: Task, i: number) => {
        const numericTaskCode = taskNameToCodeMap.get(task.name);
        const pos = originalLocationsMap.get(task.name);
        const x = pos ? (pos as any).x : 150 + i * 200;
        const y = pos ? (pos as any).y : 150;
        if (numericTaskCode) {
          payloadLocations.push({ taskCode: numericTaskCode, x, y });
        }
      });

      tasks.forEach((task: Task) => {
        const postTaskCode = taskNameToCodeMap.get(task.name);
        if (!postTaskCode) return;

        if (task.deps) {
          task.deps.forEach((depName: string) => {
            const preTaskCode = taskNameToCodeMap.get(depName);
            if (preTaskCode) {
              const depTask = tasks.find(t => t.name === depName);
              if (depTask && depTask.type !== 'CONDITIONS' && depTask.type !== 'SWITCH') {
                taskRelationJson.push({
                  name: '',
                  preTaskCode: preTaskCode,
                  preTaskVersion: 0,
                  postTaskCode: postTaskCode,
                  postTaskVersion: 0,
                  conditionType: 'NONE',
                  conditionParams: {}
                });
              }
            }
          });
        }

        if (task.type === 'SWITCH') {
          const preTaskCode = taskNameToCodeMap.get(task.name);
          if (!preTaskCode) return;

          const originalTask = originalTasks.find((t: any) => t.name === task.name);
          const switchResult = originalTask?.task_params?.switchResult;
          if (switchResult) {
            if (switchResult.dependTaskList) {
              for (const item of switchResult.dependTaskList) {
                const postTaskCode = taskNameToCodeMap.get(item.nextNode);
                if (postTaskCode) {
                  taskRelationJson.push({
                    name: '',
                    preTaskCode: preTaskCode,
                    preTaskVersion: 0,
                    postTaskCode: postTaskCode,
                    postTaskVersion: 0,
                    conditionType: 'NONE',
                    conditionParams: {}
                  });
                }
              }
            }
            if (switchResult.nextNode) {
              const postTaskCode = taskNameToCodeMap.get(switchResult.nextNode);
              if (postTaskCode) {
                taskRelationJson.push({
                  name: '',
                  preTaskCode: preTaskCode,
                  preTaskVersion: 0,
                  postTaskCode: postTaskCode,
                  postTaskVersion: 0,
                  conditionType: 'NONE',
                  conditionParams: {}
                });
              }
            }
          }
        }

        if (task.type === 'CONDITIONS') {
          const preTaskCode = taskNameToCodeMap.get(task.name);
          if (!preTaskCode) return;

          const successNodes = task.task_params?.dependence?.dependTaskList?.[0]?.conditionResult?.successNode || [];
          for (const nodeName of successNodes) {
            const postTaskCode = taskNameToCodeMap.get(nodeName);
            if (postTaskCode) {
              taskRelationJson.push({
                name: '',
                preTaskCode: preTaskCode,
                preTaskVersion: 0,
                postTaskCode: postTaskCode,
                postTaskVersion: 0,
                conditionType: 'SUCCESS',
                conditionParams: {}
              });
            }
          }

          const failedNodes = task.task_params?.dependence?.dependTaskList?.[0]?.conditionResult?.failedNode || [];
          for (const nodeName of failedNodes) {
            const postTaskCode = taskNameToCodeMap.get(nodeName);
            if (postTaskCode) {
              taskRelationJson.push({
                name: '',
                preTaskCode: preTaskCode,
                preTaskVersion: 0,
                postTaskCode: postTaskCode,
                postTaskVersion: 0,
                conditionType: 'FAILURE',
                conditionParams: {}
              });
            }
          }
        }
      });

      const targetNodes = new Set(taskRelationJson.map(r => r.postTaskCode));
      const rootTasks = tasks.filter(t => !targetNodes.has(t.name));
      for (const rootTask of rootTasks) {
        const numericTaskCode = taskNameToCodeMap.get(rootTask.name);
        if (numericTaskCode && !taskRelationJson.some(r => r.postTaskCode === numericTaskCode)) {
          taskRelationJson.push({
            name: '',
            preTaskCode: 0,
            preTaskVersion: 0,
            postTaskCode: numericTaskCode,
            postTaskVersion: 0,
            conditionType: 'NONE',
            conditionParams: {}
          });
        }
      }
      
      // 6. Assemble payload
      const globalParams = (doc.parameters || []).map((p: any) => ({
        prop: p.name,
        value: p.value,
        direct: p.direction,
        type: p.type,
      }));

      const payload = {
        uuid: record.uuid,
        name: workflow.name || record.name,
        project: workflow.project || 'default',
        description: workflow.description || '',
        globalParams: JSON.stringify(globalParams),
        timeout: workflow.timeout || 0,
        executionType: workflow.executionType || 'PARALLEL',
        taskDefinitionJson: JSON.stringify(taskDefinitionJson),
        taskRelationJson: JSON.stringify(taskRelationJson),
        locations: JSON.stringify(payloadLocations),
        isNew: record.releaseState === 'UNSUBMITTED',
        schedule: undefined as any,
      };

      if (workflow.schedule) {
        payload.schedule = {
          startTime: new Date().toISOString().slice(0, 19).replace('T', ' '),
          endTime: '2125-07-25 00:00:00',
          crontab: workflow.schedule,
          timezoneId: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
      }

      await api.createOrUpdateDsWorkflow(payload);
      dispatch(fetchWorkflows());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      throw new Error(`上线工作流时出错: ${errorMessage}`);
    }
  }
);

export default homeSlice.reducer;
