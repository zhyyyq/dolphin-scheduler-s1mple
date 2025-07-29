import React, { useEffect, useState, useCallback } from 'react';
import './index.less';
import { useNavigate, useParams } from 'react-router-dom';
import { App as AntApp } from 'antd';
import yaml from 'yaml';
import dayjs from 'dayjs';
import '../../components/TaskNode'; // Register custom node
import { Task, WorkflowDetail } from '../../types';
import api from '../../api';
import EditorDagGraph from './components/EditorDagGraph';
import { WorkflowToolbar } from './components/WorkflowToolbar';
import EditTaskModal from './components/EditTaskModal';
import EditParamNodeModal from './components/EditParamNodeModal';
import EditEdgeLabelModal from './components/EditEdgeLabelModal';
import { ViewYamlModal } from './components/ViewYamlModal';
import { WorkflowContextMenu } from './components/WorkflowContextMenu';
import { taskTypes } from '../../config/taskTypes';
import { generateYamlStr as generateYaml } from '../../utils/yamlUtils';

const WorkflowEditorPage: React.FC = () => {
  const [diyFunctions, setDiyFunctions] = useState<any[]>([]);
  const navigate = useNavigate();
  const { workflow_uuid } = useParams<{ workflow_uuid: string }>();
  const { message } = AntApp.useApp();

  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; px: number; py: number }>({ visible: false, x: 0, y: 0, px: 0, py: 0 });
  const [isYamlModalVisible, setIsYamlModalVisible] = useState(false);
  const [yamlContent, setYamlContent] = useState('');
  const [currentTaskNode, setCurrentTaskNode] = useState<any>(null);
  const [currentParamNode, setCurrentParamNode] = useState<any>(null);
  const [currentEdge, setCurrentEdge] = useState<any>(null);
  const [allTasksForModal, setAllTasksForModal] = useState<Task[]>([]);
  const [workflowName, setWorkflowName] = useState('my-workflow');
  const [workflowSchedule, setWorkflowSchedule] = useState('0 0 * * *');
  const [isScheduleEnabled, setIsScheduleEnabled] = useState(true);
  const [scheduleTimeRange, setScheduleTimeRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([
    dayjs(),
    dayjs().add(100, 'year'),
  ]);

  const handleScheduleTimeRangeChange = useCallback((dates: [dayjs.Dayjs | null, dayjs.Dayjs | null]) => {
    setScheduleTimeRange(dates);
  }, []);
  const [workflowUuid, setWorkflowUuid] = useState<string | null>(null);
  const [workflowData, setWorkflowData] = useState<WorkflowDetail | null>(null);
  const [originalYaml, setOriginalYaml] = useState<string>('');

  const handleBlankContextMenu = useCallback((e: any, x: number, y: number) => {
    e.preventDefault();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, px: x, py: y });
  }, []);

  const handleEdgeDoubleClick = useCallback((edge: any) => {
    const sourceNode = edge.getSourceNode();
    if (sourceNode && sourceNode.getData().type === 'SWITCH') {
      setCurrentEdge(edge);
    }
  }, []);

  const [graph, setGraphInstance] = useState<any>(null);
  const [loadGraphData, setLoadGraphData] = useState<any>(null);
  const [autoLayout, setAutoLayout] = useState<any>(null);

  const handleNodeDoubleClick = useCallback((args: { node: any }) => {
    const { node } = args;
    const nodeData = node.getData();
    
    if (nodeData.type === 'PARAMS') {
      setCurrentParamNode({ ...nodeData, id: node.id });
    } else {
      const allNodes = graph.getNodes().map((n: any) => n.getData() as Task);
      setAllTasksForModal(allNodes);
      setCurrentTaskNode({ ...nodeData, id: node.id });
    }
  }, [graph]);

  useEffect(() => {
    const fetchDiyFunctions = async () => {
      try {
        const funcs = await api.get<any[]>('/api/diy-functions');
        setDiyFunctions(funcs);
      } catch (error) {
        message.error('加载自定义组件失败');
      }
    };

    fetchDiyFunctions();

    if (workflow_uuid) {
      const fetchWorkflow = async () => {
        try {
          const response = await api.get<WorkflowDetail>(`/api/workflow/${workflow_uuid}`);
          setWorkflowData(response);
          setOriginalYaml(response.yaml_content);
        } catch (error) {
          message.error('加载工作流数据失败。');
        }
      };
      fetchWorkflow();
    }
  }, [workflow_uuid, message]);

  // Effect for workflow metadata
  useEffect(() => {
    if (!workflowData) return;

    const { name, uuid, yaml_content } = workflowData;
    setWorkflowName(name);
    setWorkflowUuid(uuid);

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
        setWorkflowSchedule(scheduleStr);
        setIsScheduleEnabled(true);
        if (startTime && endTime) {
          setScheduleTimeRange([dayjs(String(startTime)), dayjs(String(endTime))]);
        }
      } else {
        setIsScheduleEnabled(false);
      }
    } catch (error) {
      message.error(`解析工作流元数据失败: ${(error as Error).message}`);
    }
  }, [workflowData?.name, workflowData?.uuid, workflowData?.yaml_content]);

  // Effect for graph content
  useEffect(() => {
    const loadGraphContent = async () => {
      if (!graph || !workflowData) return;

      const { yaml_content } = workflowData;
      try {
        const doc = yaml.parseDocument(yaml_content);
        const tasks = (doc.get('tasks') as any)?.toJSON() || [];
        
        // Pre-process DIY_FUNCTION tasks to enrich them with full data
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
        const locations = workflowData.locations ? JSON.parse(workflowData.locations) : null;
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
        loadGraphData(allNodes, relations, locations);
      } catch (error) {
        message.error(`解析工作流 YAML 失败: ${(error as Error).message}`);
      }
    };

    loadGraphContent();
  }, [graph, workflowData?.yaml_content, loadGraphData]);

  const handleSaveNode = useCallback((updatedNode: Task) => {
    if (!graph) return;
    
    const nodeToUpdate = graph.getNodes().find((n: any) => n.id === (updatedNode as any).id);
    if (nodeToUpdate) {
      const existingData = nodeToUpdate.getData();
      const newData = { ...existingData, ...updatedNode };
      
      // Sync name and label, which is crucial for both tasks and params
      if (newData.name) {
        newData.label = newData.name;
      }
      nodeToUpdate.setData(newData);
    }
    
    setCurrentTaskNode(null);
    setCurrentParamNode(null);
  }, [graph]);

  const handleSaveEdgeLabel = useCallback((edge: any, newLabel: string) => {
    edge.setLabelAt(0, {
      attrs: {
        label: {
          text: newLabel,
        },
      },
    });
    setCurrentEdge(null);
  }, []);

  const handleCancelEditEdgeLabel = useCallback(() => {
    setCurrentEdge(null);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setCurrentTaskNode(null);
    setCurrentParamNode(null);
  }, []);

  const handleShowYaml = useCallback(() => {
    if (!graph) return;
    const yamlStr = generateYaml(graph, workflowName, isScheduleEnabled, workflowSchedule, scheduleTimeRange, originalYaml);
    setYamlContent(yamlStr);
    setIsYamlModalVisible(true);
  }, [graph, workflowName, isScheduleEnabled, workflowSchedule, scheduleTimeRange, originalYaml]);

  const handleSyncYamlToGraph = useCallback(async () => {
    if (!graph) return;
    try {
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
      loadGraphData(allNodes, relations);
      setWorkflowName(workflowNameFromYaml);
      message.success('从 YAML 更新画布成功！');
      setIsYamlModalVisible(false);
    } catch (error: any) {
      message.error(`从 YAML 同步到画布失败: ${error.message}`);
    }
  }, [graph, yamlContent, loadGraphData, message]);

  const handleSave = useCallback(async () => {
    if (!graph) return;
    const yamlStr = generateYaml(graph, workflowName, isScheduleEnabled, workflowSchedule, scheduleTimeRange, originalYaml);
    if (!yamlStr) {
      message.error('画布为空或未初始化。');
      return;
    }

    const locations = graph.getNodes().map((node: any) => {
      const { x, y } = node.getPosition();
      const data = node.getData();
      return { taskCode: data.name, x, y };
    });

    try {
      const response = await api.post<{ filename: string; uuid: string }>('/api/workflow/yaml', {
        name: workflowName,
        content: yamlStr,
        original_filename: workflow_uuid ? `${workflow_uuid}.yaml` : undefined,
        uuid: workflowUuid,
        locations: JSON.stringify(locations),
      });
      setWorkflowUuid(response.uuid);
      message.success('工作流保存成功！');
      navigate('/');
    } catch (error: any) {
      message.error(`保存工作流时出错: ${error.message}`);
    }
  }, [graph, workflowName, isScheduleEnabled, workflowSchedule, scheduleTimeRange, originalYaml, workflow_uuid, workflowUuid, message, navigate]);

  const handleMenuClick = useCallback((e: { key: string }) => {
    if (!graph) return;

    if (e.key.startsWith('diy-')) {
      const functionName = e.key.substring(4);
      const func = diyFunctions.find(f => f.functionName === functionName);
      if (!func) return;

      const diyTaskInfo = taskTypes.find((t: any) => t.type === 'DIY_FUNCTION');
      if (!diyTaskInfo || typeof diyTaskInfo.createNode !== 'function') return;

      diyTaskInfo.createNode(graph, diyTaskInfo, contextMenu, func);

      setContextMenu({ ...contextMenu, visible: false });
      return;
    }

    const taskInfo = taskTypes.find((t: any) => t.type === e.key);
    if (!taskInfo) return;

    if (typeof taskInfo.createNode === 'function') {
      taskInfo.createNode(graph, taskInfo, contextMenu);
    }

    setContextMenu({ ...contextMenu, visible: false });
  }, [graph, contextMenu, diyFunctions]);

  const handleImportYaml = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target?.result as string;
        setOriginalYaml(content);
        
        try {
          const doc = yaml.parseDocument(content);
          const name = doc.getIn(['workflow', 'name']) as string || 'imported-workflow';
          const schedule = doc.getIn(['workflow', 'schedule']);

          setWorkflowName(name);
          if (schedule !== undefined && schedule !== null) {
            setWorkflowSchedule(String(schedule));
            setIsScheduleEnabled(true);
          } else {
            setIsScheduleEnabled(false);
          }

          // Reparse and load graph
          const tasks = (doc.get('tasks') as any).toJSON();
          const relations: { from: string, to: string }[] = [];
          for (const task of tasks) {
            if (task.deps) {
              for (const dep of task.deps) {
                relations.push({ from: dep, to: task.name });
              }
            }
          }
          graph?.clearCells();
          loadGraphData(tasks, relations);

          message.success('YAML 导入成功！');
        } catch (err) {
          message.error('解析或加载导入的 YAML 文件失败。');
        }
      };
      reader.readAsText(file);
    }
    // Reset file input to allow importing the same file again
    event.target.value = '';
  }, [graph, loadGraphData, message]);

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)' }}>
      <div style={{ flex: 1, position: 'relative' }} onClick={() => setContextMenu({ ...contextMenu, visible: false })}>
        <WorkflowToolbar
          workflowName={workflowName}
          onWorkflowNameChange={setWorkflowName}
          workflowSchedule={workflowSchedule}
          onWorkflowScheduleChange={setWorkflowSchedule}
          isScheduleEnabled={isScheduleEnabled}
          onIsScheduleEnabledChange={setIsScheduleEnabled}
          scheduleTimeRange={scheduleTimeRange}
          onScheduleTimeRangeChange={handleScheduleTimeRangeChange}
          onShowYaml={handleShowYaml}
          onSave={handleSave}
          onAutoLayout={autoLayout}
          onImportYaml={handleImportYaml}
        />
        <EditorDagGraph
          onBlankContextMenu={handleBlankContextMenu}
          onEdgeDoubleClick={handleEdgeDoubleClick}
          onNodeDoubleClick={handleNodeDoubleClick}
          setGraphInstance={setGraphInstance}
          setLoadGraphData={setLoadGraphData}
          setAutoLayout={setAutoLayout}
        />
        <EditTaskModal
          open={!!currentTaskNode}
          task={currentTaskNode}
          allTasks={allTasksForModal}
          graph={graph}
          onCancel={handleCancelEdit}
          onSave={handleSaveNode}
        />
        <EditParamNodeModal
          open={!!currentParamNode}
          node={currentParamNode}
          graph={graph}
          onCancel={handleCancelEdit}
          onSave={handleSaveNode}
        />
        <EditEdgeLabelModal
          open={!!currentEdge}
          edge={currentEdge}
          onCancel={handleCancelEditEdgeLabel}
          onSave={handleSaveEdgeLabel}
        />
        <ViewYamlModal
          isModalVisible={isYamlModalVisible}
          onCancel={() => setIsYamlModalVisible(false)}
          onSync={handleSyncYamlToGraph}
          yamlContent={yamlContent}
          onYamlContentChange={setYamlContent}
          originalYaml={originalYaml}
        />
        <WorkflowContextMenu
          visible={contextMenu.visible}
          x={contextMenu.x}
          y={contextMenu.y}
          onMenuClick={handleMenuClick}
          diyFunctions={diyFunctions}
        />
      </div>
    </div>
  );
};

export default WorkflowEditorPage;
