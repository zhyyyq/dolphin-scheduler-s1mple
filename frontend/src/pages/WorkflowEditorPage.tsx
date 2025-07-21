import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { App as AntApp } from 'antd';
import * as yaml from 'js-yaml';
import '../components/TaskNode'; // Register custom node
import { Task } from '../types';
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
  const containerRef = useRef<HTMLDivElement>(null);

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

  const handleNodeDoubleClick = (node: any) => {
    setCurrentNode(node);
    setNodeName(node.getData().label);
    setNodeCommand(node.getData().command);
    setIsEditModalVisible(true);
  };

  const handleBlankContextMenu = (e: any, x: number, y: number) => {
    e.preventDefault();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, px: x, py: y });
  };

  const { graph, loadGraphData } = useGraph({
    container: containerRef.current,
    onNodeDoubleClick: handleNodeDoubleClick,
    onBlankContextMenu: handleBlankContextMenu,
  });

  useEffect(() => {
    if (workflow_uuid) {
      const fetchWorkflow = async () => {
        try {
          const response = await api.get<{ name: string; uuid: string; schedule: string; tasks: Task[]; relations: { from: string; to: string }[] }>(`/api/workflow/${workflow_uuid}`);
          const { name, uuid, schedule, tasks, relations } = response;
          setWorkflowName(name);
          setWorkflowUuid(uuid);
          if (schedule) setWorkflowSchedule(schedule);
          if (graph) loadGraphData(tasks, relations);
        } catch (error) {
          message.error('Failed to load workflow data.');
        }
      };
      fetchWorkflow();
    }
  }, [workflow_uuid, graph, loadGraphData, message]);

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
    if (graph) {
      const { cells } = graph.toJSON();
      const nodes = cells.filter(cell => cell.shape === 'task-node');
      const edges = cells.filter(cell => cell.shape === 'edge');
      const tasks = nodes.map(node => {
        const nodeData = node.data;
        const deps = edges.filter(edge => edge.target.cell === node.id).map(edge => {
          const sourceNode = nodes.find(n => n.id === edge.source.cell);
          return sourceNode ? sourceNode.data.label : '';
        }).filter(name => name);
        const task: any = { name: nodeData.label, task_type: nodeData.taskType, deps };
        if (nodeData.taskType === 'SHELL' || nodeData.taskType === 'PYTHON') task.command = nodeData.command;
        // ... (add other task types properties)
        return task;
      });
      const workflow: any = { workflow: { name: workflowName, schedule: isScheduleEnabled ? workflowSchedule : '' }, tasks };
      if (workflowUuid) workflow.workflow.uuid = workflowUuid;
      setYamlContent(yaml.dump(workflow));
      setIsYamlModalVisible(true);
    }
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
    if (graph) {
      const { cells } = graph.toJSON();
      // ... (logic to generate yaml from graph)
      const yamlStr = ''; // Placeholder
      try {
        const response = await api.post<{ filename: string, uuid: string }>('/api/workflow/yaml', {
          name: workflowName,
          content: yamlStr,
          original_filename: workflow_uuid ? `${workflow_uuid}.yaml` : undefined,
        });
        setWorkflowUuid(response.uuid);
        message.success('Workflow saved successfully!');
        navigate('/');
      } catch (error: any) {
        message.error(`Error: ${error.message}`);
      }
    }
  };

  const handleMenuClick = (e: { key: string }) => {
    if (!graph) return;
    const task = taskTypes.find(t => t.type === e.key);
    if (task) {
      const node = graph.addNode({
        shape: 'task-node',
        x: contextMenu.px,
        y: contextMenu.py,
        data: { label: task.label, taskType: task.type, command: task.command },
      });
      node.addPorts([{ group: 'top' }, { group: 'right' }, { group: 'bottom' }, { group: 'left' }]);
    }
    setContextMenu({ ...contextMenu, visible: false });
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
        />
        <div ref={containerRef} style={{ width: '100%', height: '100%' }}></div>
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
