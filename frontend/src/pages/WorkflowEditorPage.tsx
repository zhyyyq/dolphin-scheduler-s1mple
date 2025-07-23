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
    const nodeData = node.getData();
    setCurrentNode({ ...nodeData, id: node.id });
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
        const tasks = (doc.get('tasks') as any).toJSON();
        const relations: { from: string, to: string }[] = [];
        for (const task of tasks) {
          if (task.deps) {
            for (const dep of task.deps) {
              relations.push({ from: dep, to: task.name });
            }
          }
        }
        loadGraphData(tasks, relations);
      } catch (error) {
        message.error('解析工作流 YAML 失败。');
      }
    }
  }, [graph, workflowData, loadGraphData, message]);

  const generateYamlStr = () => {
    if (!graph) return '';

    const doc = yaml.parseDocument(originalYaml || 'workflow:\n  name: new-workflow\ntasks: []');

    doc.setIn(['workflow', 'name'], workflowName);
    if (isScheduleEnabled) {
      doc.setIn(['workflow', 'schedule'], workflowSchedule);
    } else {
      doc.deleteIn(['workflow', 'schedule']);
    }

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
        deps: deps,
      };
      
      delete taskPayload.label;
      delete taskPayload._display_type; // Remove internal display type
      delete taskPayload.id; // Remove internal id
      return taskPayload;
    });

    doc.set('tasks', tasks);

    // Traverse the document to set flow style for http_params
    const tasksNode = doc.get('tasks', true);
    if (tasksNode instanceof yaml.YAMLSeq && tasksNode.items) {
      tasksNode.items.forEach(taskNode => {
        if (taskNode instanceof yaml.YAMLMap) {
          const httpParamsNode = taskNode.get('http_params', true);
          if (httpParamsNode instanceof yaml.YAMLSeq && httpParamsNode.items) {
            // Do not set flow on the sequence itself.
            // httpParamsNode.flow = true; 
            httpParamsNode.items.forEach(item => {
              if (item instanceof yaml.YAMLMap) {
                item.flow = true; // Set flow style on each object within the sequence
              }
            });
          }
        }
      });
    }

    return doc.toString();
  };

  const handleSaveTask = (updatedTask: Task) => {
    if (graph && currentNode) {
      const node = graph.getNodes().find(n => n.id === currentNode.id);
      if (node) {
        const existingData = node.getData();
        const newData = { ...existingData, ...updatedTask };
        // Sync name and label
        if (newData.name) {
          newData.label = newData.name;
        }
        node.setData(newData);
      }
    }
    setCurrentNode(null);
  };

  const handleCancelTask = () => {
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
    if (!yamlStr) {
      message.error('画布为空或未初始化。');
      return;
    }

    try {
      const response = await api.post<{ filename: string; uuid: string }>('/api/workflow/yaml', {
        name: workflowName,
        content: yamlStr,
        original_filename: workflow_uuid ? `${workflow_uuid}.yaml` : undefined,
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
    const task = taskTypes.find(t => t.type === e.key);
    if (task) {
      const existingNodes = graph.getNodes();
      let newNodeName = task.label;
      let counter = 1;
      while (existingNodes.some(n => n.getData().label === newNodeName)) {
        newNodeName = `${task.label}_${counter}`;
        counter++;
      }

      graph.addNode({
        shape: 'task-node',
        x: contextMenu.px,
        y: contextMenu.py,
        data: {
          name: newNodeName,
          label: newNodeName,
          task_type: task.type,
          type: task.type,
          command: task.command,
          _display_type: task.type, // Set display type for new nodes
        },
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
          open={!!currentNode}
          task={currentNode}
          onCancel={handleCancelTask}
          onSave={handleSaveTask}
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
