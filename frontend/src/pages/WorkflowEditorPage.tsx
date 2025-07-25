import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { App as AntApp } from 'antd';
import yaml from 'yaml';
import '../components/TaskNode'; // Register custom node
import { Task, WorkflowDetail } from '../types';
import api from '../api';
import { useGraph } from '../hooks/useGraph';
import { WorkflowToolbar } from '../components/WorkflowToolbar';
import EditTaskModal from '../components/EditTaskModal';
import EditParamNodeModal from '../components/EditParamNodeModal';
import { ViewYamlModal } from '../components/ViewYamlModal';
import { WorkflowContextMenu } from '../components/WorkflowContextMenu';
import { taskTypes } from '../config/taskTypes';

const WorkflowEditorPage: React.FC = () => {
  const navigate = useNavigate();
  const { workflow_uuid } = useParams<{ workflow_uuid: string }>();
  const { message } = AntApp.useApp();
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const containerRefCallback = useCallback((node: HTMLDivElement) => {
    if (node) {
      setContainer(node);
    }
  }, []);

  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; px: number; py: number }>({ visible: false, x: 0, y: 0, px: 0, py: 0 });
  const [isYamlModalVisible, setIsYamlModalVisible] = useState(false);
  const [yamlContent, setYamlContent] = useState('');
  const [currentTaskNode, setCurrentTaskNode] = useState<any>(null);
  const [currentParamNode, setCurrentParamNode] = useState<any>(null);
  const [allTasksForModal, setAllTasksForModal] = useState<Task[]>([]);
  const [nodeName, setNodeName] = useState('');
  const [nodeCommand, setNodeCommand] = useState('');
  const [workflowName, setWorkflowName] = useState('my-workflow');
  const [workflowSchedule, setWorkflowSchedule] = useState('0 0 0 * * ? *');
  const [isScheduleEnabled, setIsScheduleEnabled] = useState(true);
  const [workflowUuid, setWorkflowUuid] = useState<string | null>(null);
  const [workflowData, setWorkflowData] = useState<WorkflowDetail | null>(null);
  const [originalYaml, setOriginalYaml] = useState<string>('');

  const handleBlankContextMenu = useCallback((e: any, x: number, y: number) => {
    e.preventDefault();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, px: x, py: y });
  }, []);

  const { graph, loadGraphData, autoLayout } = useGraph({
    container: container,
    onBlankContextMenu: handleBlankContextMenu,
  });

  useEffect(() => {
    if (graph) {
      const handleNodeDoubleClick = (args: { node: any }) => {
        const { node } = args;
        const nodeData = node.getData();
        
        if (nodeData.type === 'PARAMS') {
          setCurrentParamNode({ ...nodeData, id: node.id });
        } else {
          const allNodes = graph.getNodes().map(n => n.getData() as Task);
          setAllTasksForModal(allNodes);
          setCurrentTaskNode({ ...nodeData, id: node.id });
        }
      };

      graph.on('node:dblclick', handleNodeDoubleClick);

      return () => {
        graph.off('node:dblclick', handleNodeDoubleClick);
      };
    }
  }, [graph]);

  useEffect(() => {
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

  useEffect(() => {
    if (graph && workflowData) {
      const { name, uuid, yaml_content } = workflowData;
      setWorkflowName(name);
      setWorkflowUuid(uuid);

      try {
        const doc = yaml.parseDocument(yaml_content);
        const schedule = doc.getIn(['workflow', 'schedule']);
        if (schedule !== undefined && schedule !== null) {
          setWorkflowSchedule(String(schedule));
          setIsScheduleEnabled(true);
        } else {
          setIsScheduleEnabled(false);
        }
        const tasks = (doc.get('tasks') as any)?.toJSON() || [];
        const parameters = (doc.get('parameters') as any)?.toJSON() || [];

        const paramNodes = parameters.map((p: any) => ({
          name: p.name,
          label: p.name,
          type: 'PARAMS',
          task_type: 'PARAMS',
          task_params: {
            prop: p.name,
            type: p.type,
            value: p.value,
          },
        }));

        const allNodes = [...tasks, ...paramNodes];
        
        const locations = workflowData.locations ? JSON.parse(workflowData.locations) : null;
        const relations: { from: string, to: string }[] = [];
        for (const task of tasks) { // Only iterate over real tasks for deps
          if (task.deps) {
            for (const dep of task.deps) {
              relations.push({ from: dep, to: task.name });
            }
          }
        }
        loadGraphData(allNodes, relations, locations);
      } catch (error) {
        message.error('解析工作流 YAML 失败。');
      }
    }
  }, [graph, workflowData, loadGraphData, message]);

  const generateYamlStr = () => {
    if (!graph) return '';

    const doc = yaml.parseDocument(originalYaml || 'workflow:\n  name: new-workflow\ntasks: []\nparameters: []');

    // --- Workflow Metadata ---
    doc.setIn(['workflow', 'name'], workflowName);
    if (isScheduleEnabled) {
      doc.setIn(['workflow', 'schedule'], workflowSchedule);
    } else {
      doc.deleteIn(['workflow', 'schedule']);
    }

    const { cells } = graph.toJSON();
    const allGraphNodes = cells.filter(cell => cell.shape === 'task-node');
    const edges = cells.filter(cell => cell.shape === 'edge');
    const nodeMap = new Map(allGraphNodes.map(n => [n.id, n.data]));

    // Identify all connected parameter nodes to distinguish them from global ones
    const connectedParamIds = new Set();
    edges.forEach(edge => {
      const sourceNode = nodeMap.get(edge.source.cell);
      const targetNode = nodeMap.get(edge.target.cell);
      if (sourceNode?.type === 'PARAMS') connectedParamIds.add(edge.source.cell);
      if (targetNode?.type === 'PARAMS') connectedParamIds.add(edge.target.cell);
    });

    const tasks = [];
    const globalParameters = [];

    for (const node of allGraphNodes) {
      const nodeData = node.data;

      if (nodeData.type === 'PARAMS') {
        if (!connectedParamIds.has(node.id)) {
          // This is a global parameter
          globalParameters.push({
            name: nodeData.name,
            type: nodeData.task_params?.type || 'VARCHAR',
            value: nodeData.task_params?.value || '',
          });
        }
        continue; // Parameters are processed via their connections to tasks
      }

      // It's a task node
      const deps: string[] = [];
      const localParams: any[] = [];

      // Handle INCOMING connections (Dependencies and IN-parameters)
      const incomingEdges = edges.filter(edge => edge.target.cell === node.id);
      for (const edge of incomingEdges) {
        const sourceNodeData = nodeMap.get(edge.source.cell);
        if (sourceNodeData) {
          if (sourceNodeData.type === 'PARAMS') {
            localParams.push({
              prop: sourceNodeData.name,
              direct: 'IN',
              type: sourceNodeData.task_params?.type || 'VARCHAR',
              value: sourceNodeData.task_params?.value || '',
            });
          } else {
            deps.push(sourceNodeData.name);
          }
        }
      }

      // Handle OUTGOING connections (OUT-parameters)
      const outgoingEdges = edges.filter(edge => edge.source.cell === node.id);
      for (const edge of outgoingEdges) {
        const targetNodeData = nodeMap.get(edge.target.cell);
        if (targetNodeData && targetNodeData.type === 'PARAMS') {
          localParams.push({
            prop: targetNodeData.name,
            direct: 'OUT',
            type: targetNodeData.task_params?.type || 'VARCHAR',
            value: targetNodeData.task_params?.value || '',
          });
        }
      }

      const taskPayload: any = {
        name: nodeData.name,
        task_type: nodeData.task_type,
        type: nodeData.type,
        task_params: { ...(nodeData.task_params || {}) },
      };

      // The command property is now standardized for all script-based tasks
      if (nodeData.command !== undefined) {
        taskPayload.command = nodeData.command;
      }
      
      delete taskPayload.task_params.localParams; // remove from old location
      
      if (localParams.length > 0) {
        taskPayload.localParams = localParams; // add to top level
      }
      
      if (deps.length > 0) {
        taskPayload.deps = deps;
      }

      if (Object.keys(taskPayload.task_params).length === 0) {
        delete taskPayload.task_params;
      }

      tasks.push(taskPayload);
    }

    doc.set('tasks', tasks);
    if (globalParameters.length > 0) {
      doc.set('parameters', globalParameters);
    } else {
      doc.delete('parameters');
    }

    return doc.toString();
  };

  const handleSaveNode = (updatedNode: Task) => {
    if (!graph) return;
    
    const nodeToUpdate = graph.getNodes().find(n => n.id === (updatedNode as any).id);
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
  };

  const handleCancelEdit = () => {
    setCurrentTaskNode(null);
    setCurrentParamNode(null);
  };

  const handleShowYaml = () => {
    const yamlStr = generateYamlStr();
    setYamlContent(yamlStr);
    setIsYamlModalVisible(true);
  };

  const handleSyncYamlToGraph = async () => {
    if (!graph) return;
    try {
      const doc = yaml.parseDocument(yamlContent);
      const workflowNameFromYaml = doc.getIn(['workflow', 'name']) as string || 'my-workflow';
      const tasks = (doc.get('tasks') as any).toJSON();
      const relations: { from: string, to: string }[] = [];
      for (const task of tasks) {
        if (task.deps) {
          for (const dep of task.deps) {
            relations.push({ from: dep, to: task.name });
          }
        }
      }
      graph.clearCells();
      loadGraphData(tasks, relations);
      setWorkflowName(workflowNameFromYaml);
      message.success('从 YAML 更新画布成功！');
      setIsYamlModalVisible(false);
    } catch (error: any) {
      message.error(`从 YAML 同步到画布失败: ${error.message}`);
    }
  };

  const handleSave = async () => {
    const yamlStr = generateYamlStr();
    if (!yamlStr || !graph) {
      message.error('画布为空或未初始化。');
      return;
    }

    const locations = graph.getNodes().map(node => {
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
  };

  const handleMenuClick = (e: { key: string }) => {
    if (!graph) return;

    if (e.key === 'ADD_PARAM') {
      const existingNodes = graph.getNodes();
      let newNodeName = '参数';
      let counter = 1;
      while (existingNodes.some(n => n.getData().label === newNodeName)) {
        newNodeName = `参数_${counter}`;
        counter++;
      }

      const nodeData: Task = {
        name: newNodeName,
        label: newNodeName,
        type: 'PARAMS',
        task_type: 'PARAMS',
        command: '', // Add empty command to satisfy Task type
        task_params: {
          prop: newNodeName,
          type: 'VARCHAR',
          value: '',
        },
        _display_type: 'PARAMS',
      };

      graph.addNode({
        shape: 'task-node',
        x: contextMenu.px,
        y: contextMenu.py,
        data: { ...nodeData },
      });

    } else {
      const task = taskTypes.find(t => t.type === e.key);
      if (task) {
        const existingNodes = graph.getNodes();
        let newNodeName = task.label;
        let counter = 1;
        while (existingNodes.some(n => n.getData().label === newNodeName)) {
          newNodeName = `${task.label}_${counter}`;
          counter++;
        }

        const nodeData: Partial<Task> = {
          name: newNodeName,
          label: newNodeName,
          task_type: task.type,
          type: task.type,
          task_params: (task as any).default_params || {},
          _display_type: task.type,
        };

        if (['SHELL', 'PYTHON', 'HTTP'].includes(task.type)) {
          nodeData.command = task.command;
        }

        graph.addNode({
          shape: 'task-node',
          x: contextMenu.px,
          y: contextMenu.py,
          data: nodeData as Task,
        });
      }
    }
    setContextMenu({ ...contextMenu, visible: false });
  };

  const handleImportYaml = (event: React.ChangeEvent<HTMLInputElement>) => {
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
      };generateYamlStr 
      reader.readAsText(file);
    }
    // Reset file input to allow importing the same file again
    event.target.value = '';
  };

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
          onShowYaml={handleShowYaml}
          onSave={handleSave}
          onAutoLayout={autoLayout}
          onImportYaml={handleImportYaml}
        />
        <div ref={containerRefCallback} style={{ width: '100%', height: '100%' }}></div>
        <EditTaskModal
          open={!!currentTaskNode}
          task={currentTaskNode}
          allTasks={allTasksForModal}
          onCancel={handleCancelEdit}
          onSave={handleSaveNode}
        />
        <EditParamNodeModal
          open={!!currentParamNode}
          node={currentParamNode}
          onCancel={handleCancelEdit}
          onSave={handleSaveNode}
        />
        <ViewYamlModal
          isModalVisible={isYamlModalVisible}
          onCancel={() => setIsYamlModalVisible(false)}
          onSync={handleSyncYamlToGraph}
          yamlContent={yamlContent}
          onYamlContentChange={setYamlContent}
        />
        <WorkflowContextMenu
          visible={contextMenu.visible}
          x={contextMenu.x}
          y={contextMenu.y}
          onMenuClick={handleMenuClick}
        />
      </div>
    </div>
  );
};

export default WorkflowEditorPage;
