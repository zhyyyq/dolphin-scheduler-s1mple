import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import dayjs from 'dayjs';
import yaml from 'yaml';
import { Task, WorkflowDetail } from '../../types';
import { taskTypes } from '../../config/taskTypes';
import api from '../../api';
import { generateYamlStr as generateYaml } from '../../utils/yamlUtils';
import { RootState } from '..';
import { Graph } from '@antv/x6';


interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  px: number;
  py: number;
}

interface WorkflowEditorState {
  diyFunctions: any[];
  contextMenu: ContextMenuState;
  isYamlModalVisible: boolean;
  yamlContent: string;
  currentTaskNode: any | null;
  currentParamNode: any | null;
  currentEdge: any | null;
  allTasksForModal: Task[];
  workflowName: string;
  workflowSchedule: string;
  isScheduleEnabled: boolean;
  scheduleTimeRange: [string | null, string | null];
  workflowUuid: string | null;
  workflowData: WorkflowDetail | null;
  originalYaml: string;
  graph: Graph | null;
}

const initialState: WorkflowEditorState = {
  diyFunctions: [],
  graph: null,
  contextMenu: { visible: false, x: 0, y: 0, px: 0, py: 0 },
  isYamlModalVisible: false,
  yamlContent: '',
  currentTaskNode: null,
  currentParamNode: null,
  currentEdge: null,
  allTasksForModal: [],
  workflowName: 'my-workflow',
  workflowSchedule: '0 0 * * *',
  isScheduleEnabled: true,
  scheduleTimeRange: [dayjs().toISOString(), dayjs().add(100, 'year').toISOString()],
  workflowUuid: null,
  workflowData: null,
  originalYaml: '',
};

import { Keyboard } from '@antv/x6-plugin-keyboard';
import { Selection } from '@antv/x6-plugin-selection';
import { History } from '@antv/x6-plugin-history';

export const initializeGraph = createAsyncThunk(
  'workflowEditor/initializeGraph',
  async (container: HTMLDivElement, { dispatch }) => {
    const graphInstance = new Graph({
      container,
      autoResize: true,
      panning: true,
      mousewheel: true,
      background: { color: '#F2F7FA' },
      connecting: {
        router: 'manhattan',
        connector: { name: 'rounded', args: { radius: 8 } },
        anchor: 'center',
        connectionPoint: 'anchor',
        allowBlank: false,
        allowMulti: 'withPort',
        allowNode: false,
        allowEdge: false,
        snap: { radius: 20 },
        createEdge() {
          return this.createEdge({
            attrs: {
              line: {
                stroke: '#8f8f8f',
                strokeWidth: 1,
              },
            },
            zIndex: -1,
            label: {
              text: '',
            },
          });
        },
      },
      highlighting: {
        magnetAdsorbed: {
          name: 'stroke',
          args: { attrs: { fill: '#fff', stroke: '#31d0c6', strokeWidth: 4 } },
        },
      },
    });

    graphInstance.use(new Selection({ enabled: true, rubberband: true, showNodeSelectionBox: true, showEdgeSelectionBox: true }));
    graphInstance.use(new Keyboard({ enabled: true, global: true }));
    graphInstance.use(new History({ enabled: true }));

    graphInstance.bindKey(['delete', 'backspace'], () => {
      const selectedCells = graphInstance.getSelectedCells();
      if (selectedCells.length) {
        graphInstance.removeCells(selectedCells);
      }
    });

    graphInstance.bindKey('ctrl+z', () => graphInstance.undo());
    graphInstance.bindKey('ctrl+y', () => graphInstance.redo());

    graphInstance.on('node:dblclick', ({ node }) => dispatch(handleNodeDoubleClick({ node })));
    graphInstance.on('edge:dblclick', ({ edge }) => {
        const sourceNode = edge.getSourceNode();
        if (sourceNode && sourceNode.getData().type === 'SWITCH') {
          dispatch(setCurrentEdge(edge));
        }
    });
    graphInstance.on('blank:contextmenu', ({ e, x, y }) => {
        e.preventDefault();
        dispatch(setContextMenu({ visible: true, x: e.clientX, y: e.clientY, px: x, py: y }));
    });
    graphInstance.on('node:contextmenu', ({ e }) => e.preventDefault());
    graphInstance.on('edge:contextmenu', ({ e }) => e.preventDefault());

    dispatch(setGraph(graphInstance));
  }
);

export const workflowEditorSlice = createSlice({
  name: 'workflowEditor',
  initialState,
  reducers: {
    setDiyFunctions: (state, action: PayloadAction<any[]>) => {
      state.diyFunctions = action.payload;
    },
    setContextMenu: (state, action: PayloadAction<ContextMenuState>) => {
      state.contextMenu = action.payload;
    },
    setIsYamlModalVisible: (state, action: PayloadAction<boolean>) => {
      state.isYamlModalVisible = action.payload;
    },
    setYamlContent: (state, action: PayloadAction<string>) => {
      state.yamlContent = action.payload;
    },
    setCurrentTaskNode: (state, action: PayloadAction<any | null>) => {
      state.currentTaskNode = action.payload;
    },
    setCurrentParamNode: (state, action: PayloadAction<any | null>) => {
      state.currentParamNode = action.payload;
    },
    setCurrentEdge: (state, action: PayloadAction<any | null>) => {
      state.currentEdge = action.payload;
    },
    setAllTasksForModal: (state, action: PayloadAction<Task[]>) => {
      state.allTasksForModal = action.payload;
    },
    setWorkflowName: (state, action: PayloadAction<string>) => {
      state.workflowName = action.payload;
    },
    setWorkflowSchedule: (state, action: PayloadAction<string>) => {
      state.workflowSchedule = action.payload;
    },
    setIsScheduleEnabled: (state, action: PayloadAction<boolean>) => {
      state.isScheduleEnabled = action.payload;
    },
    setScheduleTimeRange: (state, action: PayloadAction<[string | null, string | null]>) => {
      state.scheduleTimeRange = action.payload;
    },
    setWorkflowUuid: (state, action: PayloadAction<string | null>) => {
      state.workflowUuid = action.payload;
    },
    setWorkflowData: (state, action: PayloadAction<WorkflowDetail | null>) => {
      state.workflowData = action.payload;
    },
    setOriginalYaml: (state, action: PayloadAction<string>) => {
      state.originalYaml = action.payload;
    },
    setGraph: (state, action: PayloadAction<any | null>) => {
      state.graph = action.payload;
    },
    clearWorkflow: (state) => {
      state.workflowUuid = null;
      state.workflowData = null;
      state.originalYaml = '';
      state.workflowName = 'my-workflow';
      state.workflowSchedule = '0 0 * * *';
      state.isScheduleEnabled = true;
      state.scheduleTimeRange = [dayjs().toISOString(), dayjs().add(100, 'year').toISOString()];
      if (state.graph) {
        state.graph.clearCells();
      }
    },
  },
});

export const saveWorkflow = createAsyncThunk(
  'workflowEditor/saveWorkflow',
  async (_, { getState, dispatch }) => {
    const state = getState() as RootState;
    const {
      graph,
      workflowName,
      isScheduleEnabled,
      workflowSchedule,
      scheduleTimeRange: scheduleTimeRangeISO,
      originalYaml,
      workflowUuid,
      workflowData,
    } = state.workflowEditor;

    if (!graph) {
      throw new Error('Graph not initialized');
    }

    const scheduleTimeRange = [
      scheduleTimeRangeISO[0] ? dayjs(scheduleTimeRangeISO[0]) : null,
      scheduleTimeRangeISO[1] ? dayjs(scheduleTimeRangeISO[1]) : null,
    ] as [dayjs.Dayjs | null, dayjs.Dayjs | null];

    const yamlStr = generateYaml(graph, workflowName, isScheduleEnabled, workflowSchedule, scheduleTimeRange, originalYaml, workflowData?.projectName, workflowData?.projectCode);
    if (!yamlStr) {
      throw new Error('Canvas is empty or not initialized.');
    }

    const locations = graph.getNodes().map((node: any) => {
      const { x, y } = node.getPosition();
      const data = node.getData();
      return { taskCode: data.name, x, y };
    });

    const response = await api.post<{ filename: string; uuid: string }>('/api/workflow/yaml', {
      name: workflowName,
      content: yamlStr,
      original_filename: workflowUuid ? `${workflowUuid}.yaml` : undefined,
      uuid: workflowUuid,
      locations: JSON.stringify(locations),
    });

    dispatch(setWorkflowUuid(response.uuid));
    return response;
  }
);

export const syncYamlToGraph = createAsyncThunk(
  'workflowEditor/syncYamlToGraph',
  async (_, { getState, dispatch }) => {
    const state = getState() as RootState;
    const { graph, yamlContent } = state.workflowEditor;

    if (!graph) {
      throw new Error('Graph not initialized');
    }

    const doc = yaml.parseDocument(yamlContent);
    const workflowNameFromYaml = doc.getIn(['workflow', 'name']) as string || 'my-workflow';
    const tasks = (doc.get('tasks') as any)?.toJSON() || [];
    const parameters = (doc.get('parameters') as any)?.toJSON() || [];

    const globalParamNodes = parameters.map((p: any) => ({
      name: p.name,
      label: p.name,
      type: 'PARAMS',
      task_type: 'PARAMS',
      task_params: {
        prop: p.name,
        type: p.type,
        value: p.value,
        direction: p.direction,
      },
    }));

    const localParamNodes: any[] = [];
    tasks.forEach((task: any) => {
      const params = task.localParams || task.task_params?.localParams;
      if (params) {
        params.forEach((p: any) => {
          if (!globalParamNodes.some((gp: any) => gp.name === p.prop) && !localParamNodes.some((lp: any) => lp.name === p.prop)) {
            localParamNodes.push({
              name: p.prop,
              label: p.prop,
              type: 'PARAMS',
              task_type: 'PARAMS',
              task_params: {
                prop: p.prop,
                type: p.type,
                value: p.value,
                direction: p.direction,
              },
            });
          }
        });
      }
    });

    const allNodes = [...tasks, ...globalParamNodes, ...localParamNodes];
    const relations: { from: string, to: string, label?: string }[] = [];

    for (const task of tasks) {
      if (task.deps) {
        for (const dep of task.deps) {
          relations.push({ from: dep, to: task.name });
        }
      }
      if (task.type === 'SWITCH' && task.task_params?.switchResult) {
        const { dependTaskList, nextNode } = task.task_params.switchResult;
        if (dependTaskList) {
          for (const item of dependTaskList) {
            if (item.nextNode) {
              relations.push({
                from: task.name,
                to: item.nextNode,
                label: item.condition,
              });
            }
          }
        }
        if (nextNode) {
          relations.push({
            from: task.name,
            to: nextNode,
            label: '', // Default branch
          });
        }
      }
      const params = task.localParams || task.task_params?.localParams;
      if (params) {
        for (const param of params) {
          if (param.direct === 'IN') {
            relations.push({ from: param.prop, to: task.name });
          } else { // OUT
            relations.push({ from: task.name, to: param.prop });
          }
        }
      }
    }

    graph.clearCells();
    // This is a side effect and cannot be dispatched. It must be called from the component.
    // We will return the data and let the component call loadGraphData.
    // loadGraphData(allNodes, relations); 
    dispatch(setWorkflowName(workflowNameFromYaml));
    dispatch(setIsYamlModalVisible(false));

    return { allNodes, relations };
  }
);

export const fetchDiyFunctions = createAsyncThunk(
  'workflowEditor/fetchDiyFunctions',
  async (_, { dispatch }) => {
    const funcs = await api.get<any[]>('/api/diy-functions');
    dispatch(setDiyFunctions(funcs));
    return funcs;
  }
);

export const importYaml = createAsyncThunk(
  'workflowEditor/importYaml',
  async (file: File, { dispatch }) => {
    const content = await file.text();
    dispatch(setOriginalYaml(content));

    const doc = yaml.parseDocument(content);
    const name = doc.getIn(['workflow', 'name']) as string || 'imported-workflow';
    const schedule = doc.getIn(['workflow', 'schedule']);

    dispatch(setWorkflowName(name));
    if (schedule !== undefined && schedule !== null) {
      dispatch(setWorkflowSchedule(String(schedule)));
      dispatch(setIsScheduleEnabled(true));
    } else {
      dispatch(setIsScheduleEnabled(false));
    }

    dispatch(loadGraphContent());
  }
);

export const handleMenuClick = createAsyncThunk(
  'workflowEditor/handleMenuClick',
  async (e: { key: string }, { getState, dispatch }) => {
    const state = getState() as RootState;
    const { graph, contextMenu, diyFunctions } = state.workflowEditor;

    if (!graph) {
      throw new Error('Graph not initialized');
    }

    if (e.key.startsWith('diy-')) {
      const functionName = e.key.substring(4);
      const func = diyFunctions.find(f => f.functionName === functionName);
      if (!func) return;

      const diyTaskInfo = taskTypes.find((t: any) => t.type === 'DIY_FUNCTION');
      if (!diyTaskInfo || typeof diyTaskInfo.createNode !== 'function') return;

      diyTaskInfo.createNode(graph, diyTaskInfo, contextMenu, func);

      dispatch(setContextMenu({ ...contextMenu, visible: false }));
      return;
    }

    const taskInfo = taskTypes.find((t: any) => t.type === e.key);
    if (!taskInfo) return;

    if (typeof taskInfo.createNode === 'function') {
      taskInfo.createNode(graph, taskInfo, contextMenu);
    }

    dispatch(setContextMenu({ ...contextMenu, visible: false }));
  }
);

export const saveEdgeLabel = createAsyncThunk(
  'workflowEditor/saveEdgeLabel',
  async ({ edge, newLabel }: { edge: any, newLabel: string }, { dispatch }) => {
    edge.setLabelAt(0, {
      attrs: {
        label: {
          text: newLabel,
        },
      },
    });
    dispatch(setCurrentEdge(null));
  }
);

export const saveNode = createAsyncThunk(
  'workflowEditor/saveNode',
  async (updatedNode: Task, { getState, dispatch }) => {
    const state = getState() as RootState;
    const { graph } = state.workflowEditor;

    if (!graph) {
      throw new Error('Graph not initialized');
    }

    const nodeToUpdate = graph.getNodes().find((n: any) => n.id === (updatedNode as any).id);
    if (nodeToUpdate) {
      const existingData = nodeToUpdate.getData();
      const newData = { ...existingData, ...updatedNode };
      
      if (newData.name) {
        newData.label = newData.name;
      }
      nodeToUpdate.setData(newData);
    }
    
    dispatch(setCurrentTaskNode(null));
    dispatch(setCurrentParamNode(null));
  }
);

export const handleNodeDoubleClick = createAsyncThunk(
  'workflowEditor/handleNodeDoubleClick',
  async (args: { node: any }, { getState, dispatch }) => {
    const { node } = args;
    const nodeData = node.getData();
    const state = getState() as RootState;
    const { graph } = state.workflowEditor;

    if (nodeData.type === 'PARAMS') {
      dispatch(setCurrentParamNode({ ...nodeData, id: node.id }));
    } else {
      const allNodes = graph!.getNodes().map((n: any) => n.getData() as Task);
      dispatch(setAllTasksForModal(allNodes));
      dispatch(setCurrentTaskNode({ ...nodeData, id: node.id }));
    }
  }
);

export const fetchWorkflow = createAsyncThunk(
  'workflowEditor/fetchWorkflow',
  async (workflow_uuid: string, { dispatch }) => {
    const response = await api.get<WorkflowDetail>(`/api/workflow/${workflow_uuid}`);
    dispatch(setWorkflowData(response));
    dispatch(setOriginalYaml(response.yaml_content));

    const { name, uuid, yaml_content } = response;
    dispatch(setWorkflowName(name));
    dispatch(setWorkflowUuid(uuid));

    try {
      const doc = yaml.parseDocument(yaml_content);
      const schedule = doc.getIn(['workflow', 'schedule']);
      const startTime = doc.getIn(['workflow', 'startTime']);
      const endTime = doc.getIn(['workflow', 'endTime']);
      if (schedule !== undefined && schedule !== null) {
        let scheduleStr = String(schedule).replace(/\?/g, '*');
        const parts = scheduleStr.split(' ');
        if (parts.length === 6 || parts.length === 7) {
          scheduleStr = `${parts[1]} ${parts[2]} ${parts[3]} ${parts[4]} ${parts[5]}`;
        }
        dispatch(setWorkflowSchedule(scheduleStr));
        dispatch(setIsScheduleEnabled(true));
        if (startTime && endTime) {
          dispatch(setScheduleTimeRange([dayjs(String(startTime)).toISOString(), dayjs(String(endTime)).toISOString()]));
        }
      } else {
        dispatch(setIsScheduleEnabled(false));
      }
    } catch (error) {
      // How to handle message.error? Maybe dispatch an error action.
      console.error(`解析工作流元数据失败: ${(error as Error).message}`);
    }

    dispatch(loadGraphContent());
    return response;
  }
);

export const loadGraphContent = createAsyncThunk(
  'workflowEditor/loadGraphContent',
  async (_, { getState, dispatch }) => {
    const state = getState() as RootState;
    const { graph, workflowData } = state.workflowEditor;

    if (!graph || !workflowData) {
      return;
    }

    const { yaml_content, locations: locationsStr } = workflowData;
    try {
      const doc = yaml.parseDocument(yaml_content);
      const tasks = (doc.get('tasks') as any)?.toJSON() || [];
      
      const diyFunctionPromises = tasks
        .filter((task: any) => task.type === 'DIY_FUNCTION')
        .map(async (task: any) => {
          const functionId = task.task_params?.functionId;
          if (functionId) {
            try {
              const funcData = await api.get<any>(`/api/diy-functions/${functionId}`);
              if (funcData) {
                task.label = funcData.functionName;
                task.command = funcData.functionContent;
                if (!task.task_params) task.task_params = {};
                task.task_params.contentHash = funcData.contentHash;
              } else {
                throw new Error('API returned empty data');
              }
            } catch (e) {
              console.error(`Failed to fetch DIY function ${functionId}`, e);
              task.label = `Error: Func ${functionId} not found`;
              task.name = `Error: Func ${functionId} not found`;
            }
          }
        });

      await Promise.all(diyFunctionPromises);

      const parameters = (doc.get('parameters') as any)?.toJSON() || [];
      const globalParamNodes = parameters.map((p: any) => ({
        name: p.name,
        label: p.name,
        type: 'PARAMS',
        task_type: 'PARAMS',
        task_params: { prop: p.name, type: p.type, value: p.value, direction: p.direction },
      }));

      const localParamNodes: any[] = [];
      tasks.forEach((task: any) => {
        const params = task.localParams || task.task_params?.localParams;
        if (params) {
          params.forEach((p: any) => {
            if (!globalParamNodes.some((gp: any) => gp.name === p.prop) && !localParamNodes.some((lp: any) => lp.name === p.prop)) {
              localParamNodes.push({
                name: p.prop,
                label: p.prop,
                type: 'PARAMS',
                task_type: 'PARAMS',
                task_params: { prop: p.prop, type: p.type, value: p.value, direction: p.direction },
              });
            }
          });
        }
      });

      const allNodes = [...tasks, ...globalParamNodes, ...localParamNodes];
      const locations = locationsStr ? JSON.parse(locationsStr) : null;
      const relations: { from: string, to: string, sourcePort?: string, targetPort?: string, label?: string }[] = [];
      const conditionTasks = new Set(tasks.filter((t: any) => t.type === 'CONDITIONS').map((t: any) => t.name));

      for (const task of tasks) {
        if (task.deps) {
          for (const dep of task.deps) {
            if (!conditionTasks.has(dep)) {
              relations.push({ from: dep, to: task.name });
            }
          }
        }
        if (task.type === 'SWITCH' && task.task_params?.switchResult) {
          const { dependTaskList, nextNode } = task.task_params.switchResult;
          if (dependTaskList) {
            for (const item of dependTaskList) {
              if (item.nextNode) relations.push({ from: task.name, to: item.nextNode, label: item.condition });
            }
          }
          if (nextNode) relations.push({ from: task.name, to: nextNode, label: '' });
        }
        if (task.type === 'CONDITIONS' && task.task_params?.dependence?.dependTaskList?.[0]?.conditionResult) {
          const { successNode, failedNode } = task.task_params.dependence.dependTaskList[0].conditionResult;
          if (successNode) {
            for (const nodeName of successNode) relations.push({ from: task.name, to: nodeName, sourcePort: 'out-success', targetPort: 'in' });
          }
          if (failedNode) {
            for (const nodeName of failedNode) relations.push({ from: task.name, to: nodeName, sourcePort: 'out-failure', targetPort: 'in' });
          }
        }
        const params = task.localParams || task.task_params?.localParams;
        if (params) {
          for (const param of params) {
            if (param.direct === 'IN') relations.push({ from: param.prop, to: task.name });
            else relations.push({ from: task.name, to: param.prop });
          }
        }
      }
      
      graph.clearCells();
      allNodes.forEach((nodeData: any) => {
        const taskEditor = taskTypes.find((t) => t.type === nodeData.task_type);
        if (!taskEditor) {
          console.error(`未找到任务类型 "${nodeData.task_type}" 的编辑器配置。`);
          return;
        }
  
        const position = locations?.find((l:any) => l.taskCode === nodeData.name) || { x: 0, y: 0 };
        
        const newNode = (taskEditor as any).createNode(graph, { ...nodeData, label: nodeData.name }, { px: position.x, py: position.y });
  
        if (newNode) {
          newNode.setData(nodeData);
          if (locations) {
            newNode.position(position.x, position.y);
          }
        }
      });

      relations.forEach((rel: any) => {
        graph.addEdge({
          shape: 'edge',
          source: { cell: rel.from, port: rel.sourcePort },
          target: { cell: rel.to, port: rel.targetPort },
          labels: rel.label ? [rel.label] : [],
        });
      });
    } catch (error) {
      // How to handle message.error? Maybe dispatch an error action.
      console.error(`解析工作流 YAML 失败: ${(error as Error).message}`);
    }
  }
);

export const showYaml = createAsyncThunk(
  'workflowEditor/showYaml',
  async (_, { getState, dispatch }) => {
    const state = getState() as RootState;
    const {
      graph,
      workflowName,
      isScheduleEnabled,
      workflowSchedule,
      scheduleTimeRange: scheduleTimeRangeISO,
      originalYaml,
      workflowData,
    } = state.workflowEditor;

    if (!graph) {
      throw new Error('Graph not initialized');
    }

    const scheduleTimeRange = [
      scheduleTimeRangeISO[0] ? dayjs(scheduleTimeRangeISO[0]) : null,
      scheduleTimeRangeISO[1] ? dayjs(scheduleTimeRangeISO[1]) : null,
    ] as [dayjs.Dayjs | null, dayjs.Dayjs | null];

    const yamlStr = generateYaml(graph, workflowName, isScheduleEnabled, workflowSchedule, scheduleTimeRange, originalYaml, workflowData?.projectName, workflowData?.projectCode);
    dispatch(setYamlContent(yamlStr));
    dispatch(setIsYamlModalVisible(true));
  }
);

export const autoLayout = createAsyncThunk(
  'workflowEditor/autoLayout',
  async (_, { getState }) => {
    const state = getState() as RootState;
    const { graph } = state.workflowEditor;
    if (!graph) return;

    const dagre = await import('dagre');
    const graphNodes = graph.getNodes();
    const graphEdges = graph.getEdges();
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: 'TB', nodesep: 40, ranksep: 80 });
    g.setDefaultEdgeLabel(() => ({}));

    const width = 180;
    const height = 36;
    graphNodes.forEach((node) => {
      if (node.id) {
        g.setNode(node.id, { width, height });
      }
    });

    graphEdges.forEach((edge) => {
      const source = edge.getSource();
      const target = edge.getTarget();
      if (source && 'cell' in source && target && 'cell' in target) {
        const sourceId = source.cell as string;
        const targetId = target.cell as string;
        if (sourceId && targetId) {
          g.setEdge(sourceId, targetId);
        }
      }
    });

    dagre.layout(g);

    g.nodes().forEach((id: string) => {
      const node = graph.getCellById(id);
      if (node && node.isNode()) {
        const pos = g.node(id);
        node.position(pos.x, pos.y);
      }
    });

    graph.centerContent();
  }
);

export const {
  setDiyFunctions,
  setContextMenu,
  setIsYamlModalVisible,
  setYamlContent,
  setCurrentTaskNode,
  setCurrentParamNode,
  setCurrentEdge,
  setAllTasksForModal,
  setWorkflowName,
  setWorkflowSchedule,
  setIsScheduleEnabled,
  setScheduleTimeRange,
  setWorkflowUuid,
  setWorkflowData,
  setOriginalYaml,
  setGraph,
  clearWorkflow,
} = workflowEditorSlice.actions;

export default workflowEditorSlice.reducer;
