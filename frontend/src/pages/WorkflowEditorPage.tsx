import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { App as AntApp } from 'antd';
import * as yaml from 'js-yaml';
import '../components/TaskNode'; // Register custom node
import { Task, WorkflowDetail } from '../types';
import api from '../api';
import { useGraph } from '../hooks/useGraph';
import { WorkflowToolbar } from '../components/WorkflowToolbar';
import { EditTaskModal } from '../components/EditTaskModal';
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
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isYamlModalVisible, setIsYamlModalVisible] = useState(false);
  const [yamlContent, setYamlContent] = useState('');
  const [currentNode, setCurrentNode] = useState<any>(null);
  const [nodeName, setNodeName] = useState('');
  const [nodeCommand, setNodeCommand] = useState('');
  const [workflowName, setWorkflowName] = useState('my-workflow');
  const [workflowSchedule, setWorkflowSchedule] = useState('0 0 0 * * ? *');
  const [isScheduleEnabled, setIsScheduleEnabled] = useState(true);
  const [workflowUuid, setWorkflowUuid] = useState<string | null>(null);
  const [workflowData, setWorkflowData] = useState<WorkflowDetail | null>(null);
  const [originalYaml, setOriginalYaml] = useState<string>('');

  const handleNodeDoubleClick = useCallback((node: any) => {
    setCurrentNode(node);
    setNodeName(node.getData().label);
    setNodeCommand(node.getData().command);
    setIsEditModalVisible(true);
  }, []);

  const handleBlankContextMenu = useCallback((e: any, x: number, y: number) => {
    e.preventDefault();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, px: x, py: y });
  }, []);

  const { graph, loadGraphData, autoLayout } = useGraph({
    container: container,
    onNodeDoubleClick: handleNodeDoubleClick,
    onBlankContextMenu: handleBlankContextMenu,
  });

  useEffect(() => {
    if (workflow_uuid) {
      const fetchWorkflow = async () => {
        try {
          const response = await api.get<WorkflowDetail>(`/api/workflow/${workflow_uuid}`);
          setWorkflowData(response);
          setOriginalYaml(response.yaml_content);
        } catch (error) {
          message.error('Failed to load workflow data.');
        }
      };
      fetchWorkflow();
    }
  }, [workflow_uuid, message]);

  useEffect(() => {
    if (graph && workflowData) {
      const { name, uuid, schedule, tasks, relations } = workflowData;
      setWorkflowName(name);
      setWorkflowUuid(uuid);
      if (schedule !== undefined && schedule !== null) {
        setWorkflowSchedule(String(schedule));
        setIsScheduleEnabled(true);
      } else {
        setIsScheduleEnabled(false);
      }
      loadGraphData(tasks, relations);
    }
  }, [graph, workflowData, loadGraphData]);

  const generateYamlStr = () => {
    if (!graph) return '';

    // If we are editing an existing workflow, start with the original YAML
    // to preserve comments, formatting, and unknown fields.
    const baseData = originalYaml ? (yaml.load(originalYaml) as any) : { workflow: {}, tasks: [] };

    const { cells } = graph.toJSON();
    const nodes = cells.filter(cell => cell.shape === 'task-node');
    const edges = cells.filter(cell => cell.shape === 'edge');

    const tasks = nodes.map(node => {
      const nodeData = { ...node.data };
      const deps = edges
        .filter(edge => edge.target.cell === node.id)
        .map(edge => {
          const sourceNode = nodes.find(n => n.id === edge.source.cell);
          return sourceNode ? sourceNode.data.label : null;
        })
        .filter(Boolean);

      const taskPayload: any = {
        ...nodeData,
        name: nodeData.label,
        task_type: nodeData.taskType,
        deps: deps,
      };
      delete taskPayload.label;
      delete taskPayload.taskType;
      return taskPayload;
    });

    // Update the workflow and tasks sections of the base data
    baseData.workflow.name = workflowName;
    baseData.workflow.uuid = workflowUuid || baseData.workflow.uuid || undefined;
    
    if (isScheduleEnabled) {
      baseData.workflow.schedule = workflowSchedule;
    } else {
      // If scheduling is disabled, remove the key to keep the YAML clean.
      delete baseData.workflow.schedule;
    }
    
    baseData.tasks = tasks;

    return yaml.dump(baseData);
  };

  const handleEditModalOk = () => {
    if (currentNode && graph) {
      const allNodes = graph.getNodes();
      const isDuplicate = allNodes.some(node => node.getData().label === nodeName && node.id !== currentNode.id);
      if (isDuplicate) {
        message.error('A task with this name already exists in the workflow.');
        return;
      }
      currentNode.setData({ ...currentNode.getData(), label: nodeName, command: nodeCommand });
    }
    setIsEditModalVisible(false);
    setCurrentNode(null);
  };

  const handleShowYaml = () => {
    const yamlStr = generateYamlStr();
    setYamlContent(yamlStr);
    setIsYamlModalVisible(true);
  };

  const handleSyncYamlToGraph = async () => {
    if (!graph) return;
    try {
      const parsedWorkflow = yaml.load(yamlContent) as any;
      const workflowNameFromYaml = parsedWorkflow?.workflow?.name || 'my-workflow';
      const response = await api.post<{ preview: { tasks: Task[], relations: { from: string, to: string }[] } }>('/api/reparse', { code: yamlContent });
      const { tasks, relations } = response.preview;
      graph.clearCells();
      loadGraphData(tasks, relations);
      setWorkflowName(workflowNameFromYaml);
      message.success('Graph updated from YAML successfully!');
      setIsYamlModalVisible(false);
    } catch (error: any) {
      message.error(`Failed to sync YAML to graph: ${error.message}`);
    }
  };

  const handleSave = async () => {
    const yamlStr = generateYamlStr();
    if (!yamlStr) {
      message.error('Graph is empty or not initialized.');
      return;
    }

    try {
      const response = await api.post<{ filename: string; uuid: string }>('/api/workflow/yaml', {
        name: workflowName,
        content: yamlStr,
        original_filename: workflow_uuid ? `${workflow_uuid}.yaml` : undefined,
      });
      setWorkflowUuid(response.uuid);
      message.success('Workflow saved successfully!');
      navigate('/');
    } catch (error: any) {
      message.error(`Error saving workflow: ${error.message}`);
    }
  };

  const handleMenuClick = (e: { key: string }) => {
    if (!graph) return;
    const task = taskTypes.find(t => t.type === e.key);
    if (task) {
      graph.addNode({
        shape: 'task-node',
        x: contextMenu.px,
        y: contextMenu.py,
        data: { label: task.label, taskType: task.type, command: task.command },
      });
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
          const parsed = yaml.load(content) as any;
          const name = parsed?.workflow?.name || 'imported-workflow';
          const schedule = parsed?.workflow?.schedule;

          setWorkflowName(name);
          if (schedule !== undefined && schedule !== null) {
            setWorkflowSchedule(String(schedule));
            setIsScheduleEnabled(true);
          } else {
            setIsScheduleEnabled(false);
          }

          // Reparse and load graph
          const response = await api.post<{ preview: { tasks: Task[], relations: { from: string, to: string }[] } }>('/api/reparse', { code: content });
          const { tasks, relations } = response.preview;
          graph?.clearCells();
          loadGraphData(tasks, relations);

          message.success('YAML imported successfully!');
        } catch (err) {
          message.error('Failed to parse or load the imported YAML file.');
        }
      };
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
          isModalVisible={isEditModalVisible}
          onOk={handleEditModalOk}
          onCancel={() => setIsEditModalVisible(false)}
          currentNode={currentNode}
          nodeName={nodeName}
          onNodeNameChange={setNodeName}
          nodeCommand={nodeCommand}
          onNodeCommandChange={setNodeCommand}
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
