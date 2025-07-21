import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Graph } from '@antv/x6';
import { Stencil } from '@antv/x6-plugin-stencil';
import { Keyboard } from '@antv/x6-plugin-keyboard';
import { Selection } from '@antv/x6-plugin-selection';
import { History } from '@antv/x6-plugin-history';
import { Button, Modal, Input, App as AntApp, Switch, Select } from 'antd';
import * as yaml from 'js-yaml';
import '../components/TaskNode'; // Register custom node
import { Task, Workflow } from '../types';
import api from '../api';

const WorkflowEditorPage: React.FC = () => {
  const navigate = useNavigate();
  const { workflow_uuid } = useParams<{ workflow_uuid: string }>();
  const { message } = AntApp.useApp();
  const containerRef = useRef<HTMLDivElement>(null);
  const stencilContainerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isYamlModalVisible, setIsYamlModalVisible] = useState(false);
  const [yamlContent, setYamlContent] = useState('');
  const [currentNode, setCurrentNode] = useState<any>(null);
  const [nodeName, setNodeName] = useState('');
  const [nodeCommand, setNodeCommand] = useState('');
  const [workflowName, setWorkflowName] = useState('my-workflow');
  const [workflowSchedule, setWorkflowSchedule] = useState('0 0 0 * * ? *');
  const [isScheduleEnabled, setIsScheduleEnabled] = useState(true);
  const [workflowUuid, setWorkflowUuid] = useState<string | null>(null);

  useEffect(() => {
    const initGraph = async () => {
      if (!containerRef.current || graphRef.current) return;

      const graph = new Graph({
        container: containerRef.current,
        autoResize: true,
        panning: true,
        mousewheel: true,
        background: {
          color: '#F2F7FA',
        },
        connecting: {
          router: 'metro',
          connector: {
            name: 'rounded',
            args: {
              radius: 8,
            },
          },
          anchor: 'center',
          connectionPoint: 'anchor',
          allowBlank: false,
          allowMulti: true,
          allowNode: true,
          snap: {
            radius: 20,
          },
        },
        highlighting: {
          magnetAdsorbed: {
            name: 'stroke',
            args: {
              attrs: {
                fill: '#fff',
                stroke: '#31d0c6',
                strokeWidth: 4,
              },
            },
          },
        },
      });

      graph.use(
        new Selection({
          enabled: true,
          rubberband: true,
          showNodeSelectionBox: true,
          showEdgeSelectionBox: true,
        }),
      );

      graph.use(
        new Keyboard({
          enabled: true,
          global: true,
        }),
      );

      graph.use(
        new History({
          enabled: true,
        }),
      );

      graphRef.current = graph;

      // Bind keyboard events for deletion
      graph.bindKey(['delete', 'backspace'], () => {
        const selectedCells = graph.getSelectedCells();
        if (selectedCells.length) {
          graph.removeCells(selectedCells);
        }
      });

      // Bind undo/redo keys
      graph.bindKey('ctrl+z', () => {
        graph.undo();
      });
      graph.bindKey('ctrl+y', () => {
        graph.redo();
      });

      if (stencilContainerRef.current) {
        const stencil = new Stencil({
          title: 'Components',
          target: graph,
          stencilGraphWidth: 200,
          collapsable: true,
          groups: [
            { name: 'general', title: 'General', collapsed: true },
            { name: 'control_flow', title: 'Control Flow', collapsed: true },
            { name: 'data', title: 'Data', collapsed: true },
            { name: 'big_data', title: 'Big Data', collapsed: true },
            { name: 'cloud_ml', title: 'Cloud/ML', collapsed: true },
            { name: 'other', title: 'Other', collapsed: true },
          ],
          layoutOptions: {
            columns: 3,
            columnWidth: 80,
            rowHeight: 60,
          },
        });

        stencilContainerRef.current.appendChild(stencil.container);

        const taskTypes = [
          { label: 'Shell', type: 'SHELL', command: 'echo "Hello"', category: 'general' },
          { label: 'Python', type: 'PYTHON', command: 'print("Hello")', category: 'general' },
          { label: 'Conditions', type: 'CONDITIONS', command: '', category: 'control_flow' },
          { label: 'Switch', type: 'SWITCH', command: '', category: 'control_flow' },
          { label: 'Dependent', type: 'DEPENDENT', command: '', category: 'control_flow' },
          { label: 'Sub Process', type: 'SUB_PROCESS', command: '', category: 'control_flow' },
          { label: 'SQL', type: 'SQL', command: 'SELECT * FROM table', category: 'data' },
          { label: 'DataX', type: 'DATAX', command: '', category: 'data' },
          { label: 'Spark', type: 'SPARK', command: '', category: 'big_data' },
          { label: 'Flink', type: 'FLINK', command: '', category: 'big_data' },
          { label: 'Map Reduce', type: 'MR', command: '', category: 'big_data' },
          { label: 'Kubernetes', type: 'K8S', command: '', category: 'cloud_ml' },
          { label: 'SageMaker', type: 'SAGEMAKER', command: '', category: 'cloud_ml' },
          { label: 'MLflow', type: 'MLFLOW', command: '', category: 'cloud_ml' },
          { label: 'OpenMLDB', type: 'OPENMLDB', command: '', category: 'cloud_ml' },
          { label: 'PyTorch', type: 'PYTORCH', command: '', category: 'cloud_ml' },
          { label: 'DVC', type: 'DVC', command: '', category: 'cloud_ml' },
          { label: 'HTTP', type: 'HTTP', command: 'curl http://example.com', category: 'other' },
          { label: 'Procedure', type: 'PROCEDURE', command: '', category: 'other' },
        ];

        const nodesByCategory: { [key: string]: any[] } = {};
        taskTypes.forEach(task => {
          if (!nodesByCategory[task.category]) {
            nodesByCategory[task.category] = [];
          }
          nodesByCategory[task.category].push(
            graph.createNode({
              shape: 'task-node',
              width: 60,
              height: 40,
              data: {
                label: task.label,
                taskType: task.type,
                command: task.command,
                isStencil: true,
              },
            })
          );
        });

        Object.keys(nodesByCategory).forEach(category => {
          stencil.load(nodesByCategory[category], category);
        });
      }

      graph.on('node:dblclick', ({ node }) => {
        setCurrentNode(node);
        setNodeName(node.getData().label);
        setNodeCommand(node.getData().command);
        setIsModalVisible(true);
      });

      graph.on('node:added', ({ node }) => {
        const allNodes = graph.getNodes();
        const baseName = node.getData().label;
        let newName = baseName;
        let counter = 1;

        // Check for duplicates and generate a new name if needed
        while (allNodes.some(n => n.getData().label === newName && n.id !== node.id)) {
          newName = `${baseName}-${counter}`;
          counter++;
        }

        // Update the node's label if a new name was generated
        if (newName !== baseName) {
          node.setData({ ...node.getData(), label: newName });
        }
      });

      if (workflow_uuid) {
        try {
          const response = await api.get<{ name: string; uuid: string; schedule: string; tasks: Task[]; relations: { from: string; to: string }[], filename: string }>(`/api/workflow/${workflow_uuid}`);
          const { name, uuid, schedule, tasks, relations } = response;
          setWorkflowName(name);
          setWorkflowUuid(uuid);
          if (schedule) {
            setWorkflowSchedule(schedule);
          }

          const nodeMap = new Map();
          tasks.forEach((task: Task, index: number) => {
            const node = graph.createNode({
              shape: 'task-node',
              x: (index % 4) * 250,
              y: Math.floor(index / 4) * 150,
              data: {
                label: task.name,
                taskType: task.type,
                ...task,
              },
              ports: {
                items: [
                  { id: 'in', group: 'left' },
                  { id: 'out', group: 'right' },
                ]
              }
            });
            graph.addNode(node);
            nodeMap.set(task.name, node);
          });

          relations.forEach((rel: { from: string; to: string }) => {
            const sourceNode = nodeMap.get(rel.from);
            const targetNode = nodeMap.get(rel.to);
            if (sourceNode && targetNode) {
              graph.addEdge({
                source: sourceNode,
                target: targetNode,
                shape: 'edge',
                attrs: { line: { stroke: '#8f8f8f', strokeWidth: 1 } },
                zIndex: -1,
              });
            }
          });

          // Center the graph content after loading
          graph.centerContent();

        } catch (error) {
          message.error('Failed to load workflow data.');
        }
      }
    };

    initGraph();
  }, [workflow_uuid, message]);

  const handleOk = () => {
    if (currentNode && graphRef.current) {
      const allNodes = graphRef.current.getNodes();
      const isDuplicate = allNodes.some(
        (node) =>
          node.getData().label === nodeName && node.id !== currentNode.id
      );

      if (isDuplicate) {
        message.error('A task with this name already exists in the workflow.');
        return;
      }

      currentNode.setData({
        ...currentNode.getData(),
        label: nodeName,
        command: nodeCommand,
      });
    }
    setIsModalVisible(false);
    setCurrentNode(null);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setCurrentNode(null);
  };

  const handleShowYaml = () => {
    if (graphRef.current) {
      const { cells } = graphRef.current.toJSON();
      const nodes = cells.filter(cell => cell.shape === 'task-node');
      const edges = cells.filter(cell => cell.shape === 'edge');

      const tasks = nodes.map(node => {
        const nodeData = node.data;
        const deps = edges
          .filter(edge => edge.target.cell === node.id)
          .map(edge => {
            const sourceNode = nodes.find(n => n.id === edge.source.cell);
            return sourceNode ? sourceNode.data.label : '';
          })
          .filter(name => name);

        const task: any = {
          name: nodeData.label,
          task_type: nodeData.taskType,
          deps: deps,
        };

        if (nodeData.taskType === 'SHELL' || nodeData.taskType === 'PYTHON') {
          task.command = nodeData.command;
        }
        
        if (nodeData.cpu_quota) task.cpu_quota = nodeData.cpu_quota;
        if (nodeData.memory_max) task.memory_max = nodeData.memory_max;

        if (nodeData.taskType === 'SQL') {
          task.sql = nodeData.command;
          if (nodeData.datasource_name) task.datasource_name = nodeData.datasource_name;
          if (nodeData.sql_type) task.sql_type = nodeData.sql_type;
          if (nodeData.pre_statements) task.pre_statements = nodeData.pre_statements;
          if (nodeData.post_statements) task.post_statements = nodeData.post_statements;
          if (nodeData.display_rows) task.display_rows = nodeData.display_rows;
        }

        if (nodeData.taskType === 'HTTP') {
          task.url = nodeData.url;
          if (nodeData.http_method) task.http_method = nodeData.http_method;
          if (nodeData.http_params) task.http_params = nodeData.http_params;
          if (nodeData.http_check_condition) task.http_check_condition = nodeData.http_check_condition;
          if (nodeData.condition) task.condition = nodeData.condition;
          if (nodeData.connect_timeout) task.connect_timeout = nodeData.connect_timeout;
          if (nodeData.socket_timeout) task.socket_timeout = nodeData.socket_timeout;
        }

        if (nodeData.taskType === 'SUB_PROCESS') {
          task.workflow_name = nodeData.workflow_name;
        }

        if (nodeData.taskType === 'SWITCH') {
          task.condition = nodeData.switch_condition;
        }

        if (nodeData.taskType === 'CONDITIONS') {
          task.success_task = nodeData.success_task;
          task.failed_task = nodeData.failed_task;
          task.op = nodeData.op;
          task.groups = nodeData.groups;
        }

        return task;
      });

      const workflow: any = {
        workflow: {
          name: workflowName,
          schedule: isScheduleEnabled ? workflowSchedule : '',
        },
        tasks,
      };

      if (workflowUuid) {
        workflow.workflow.uuid = workflowUuid;
      }

      const yamlStr = yaml.dump(workflow);
      setYamlContent(yamlStr);
      setIsYamlModalVisible(true);
    }
  };

  const handleSyncYamlToGraph = async () => {
    if (!graphRef.current) return;
    const graph = graphRef.current;

    try {
      // Step 1: Parse YAML and get structured data from backend
      const parsedWorkflow = yaml.load(yamlContent) as any;
      const workflowNameFromYaml = parsedWorkflow?.workflow?.name || 'my-workflow';
      
      const response = await api.post<{ preview: { tasks: Task[], relations: { from: string, to: string }[] } }>('/api/reparse', { code: yamlContent });
      const { tasks, relations } = response.preview;

      // Step 2: Clear the graph
      graph.clearCells();

      // Step 3: Re-populate the graph
      const nodeMap = new Map();
      tasks.forEach((task: Task, index: number) => {
        const node = graph.createNode({
          shape: 'task-node',
          x: (index % 4) * 250,
          y: Math.floor(index / 4) * 150,
          data: {
            label: task.name,
            taskType: task.type,
            ...task,
          },
          ports: {
            items: [
              { id: 'in', group: 'left' },
              { id: 'out', group: 'right' },
            ]
          }
        });
        graph.addNode(node);
        nodeMap.set(task.name, node);
      });

      relations.forEach((rel: { from: string; to: string }) => {
        const sourceNode = nodeMap.get(rel.from);
        const targetNode = nodeMap.get(rel.to);
        if (sourceNode && targetNode) {
          graph.addEdge({
            source: sourceNode,
            target: targetNode,
            shape: 'edge',
            attrs: { line: { stroke: '#8f8f8f', strokeWidth: 1 } },
            zIndex: -1,
          });
        }
      });

      // Step 4: Update workflow name and close modal
      setWorkflowName(workflowNameFromYaml);
      message.success('Graph updated from YAML successfully!');
      setIsYamlModalVisible(false);
      graph.centerContent();

    } catch (error: any) {
      message.error(`Failed to sync YAML to graph: ${error.message}`);
      console.error('YAML Sync Error:', error);
    }
  };

  const handleSave = async () => {
    if (graphRef.current) {

      const { cells } = graphRef.current.toJSON();
      const nodes = cells.filter(cell => cell.shape === 'task-node');
      const edges = cells.filter(cell => cell.shape === 'edge');

      const tasks = nodes.map(node => {
        const deps = edges
          .filter(edge => edge.target.cell === node.id)
          .map(edge => {
            const sourceNode = nodes.find(n => n.id === edge.source.cell);
            return sourceNode ? sourceNode.data.label : '';
          })
          .filter(name => name);
        
        return {
          name: node.data.label,
          task_type: node.data.taskType,
          command: node.data.command,
          deps: deps,
        };
      });

      const workflow: any = {
        workflow: {
          name: workflowName,
          schedule: isScheduleEnabled ? workflowSchedule : '',
        },
        tasks,
      };
      
      if (workflowUuid) {
        workflow.workflow.uuid = workflowUuid;
      }

      const yamlStr = yaml.dump(workflow);
      
      try {
        const response = await api.post<{ filename: string, uuid: string }>('/api/workflow/yaml', {
          name: workflow.workflow.name,
          content: yamlStr,
          original_filename: workflow_uuid ? `${workflow_uuid}.yaml` : undefined,
        });
        setWorkflowUuid(response.uuid); // Update UUID after saving
        message.success('Workflow saved successfully!');
        navigate('/');
      } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        message.error(`Error: ${errorMessage}`);
        console.error('Error saving workflow:', error);
      }
    }
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)' }}>
      <div ref={stencilContainerRef} style={{ width: '250px', borderRight: '1px solid #dfe3e8', position: 'relative', height: '100%', overflowY: 'auto' }}></div>
      <div style={{ flex: 1, position: 'relative' }}>
        <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '8px', background: 'white', padding: '8px', borderRadius: '6px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: '8px', fontWeight: '500', width: '120px' }}>Workflow Name:</span>
            <Input value={workflowName} onChange={e => setWorkflowName(e.target.value)} style={{ width: '200px' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: '8px', fontWeight: '500', width: '120px' }}>Schedule (Cron):</span>
            <Input
              value={workflowSchedule}
              onChange={e => setWorkflowSchedule(e.target.value)}
              style={{ width: '200px', marginRight: '8px' }}
              disabled={!isScheduleEnabled}
            />
            <Switch checked={isScheduleEnabled} onChange={setIsScheduleEnabled} />
          </div>
        </div>
        <div ref={containerRef} style={{ width: '100%', height: '100%' }}></div>
        <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 10, display: 'flex', gap: '8px' }}>
          <Button onClick={handleShowYaml}>View YAML</Button>
          <Button type="primary" onClick={handleSave}>Save Workflow</Button>
        </div>
      </div>
      <Modal title="Edit Task" open={isModalVisible} onOk={handleOk} onCancel={handleCancel}>
        <p>Name:</p>
        <Input value={nodeName} onChange={e => setNodeName(e.target.value)} />
        <p>{currentNode?.getData().taskType === 'PYTHON' ? 'Definition:' : 'Command:'}</p>
        <Input.TextArea value={nodeCommand} onChange={e => setNodeCommand(e.target.value)} rows={4} />
        {(currentNode?.getData().taskType === 'SHELL' || currentNode?.getData().taskType === 'PYTHON') && (
          <>
            <p>CPU Quota:</p>
            <Input type="number" value={currentNode.getData().cpu_quota} onChange={e => currentNode.setData({ ...currentNode.getData(), cpu_quota: Number(e.target.value) })} />
            <p>Max Memory (MB):</p>
            <Input type="number" value={currentNode.getData().memory_max} onChange={e => currentNode.setData({ ...currentNode.getData(), memory_max: Number(e.target.value) })} />
          </>
        )}
        {currentNode?.getData().taskType === 'SQL' && (
          <>
            <p>Datasource Name:</p>
            <Input value={currentNode.getData().datasource_name} onChange={e => currentNode.setData({ ...currentNode.getData(), datasource_name: e.target.value })} />
            <p>SQL Type:</p>
            <Input value={currentNode.getData().sql_type} onChange={e => currentNode.setData({ ...currentNode.getData(), sql_type: e.target.value })} />
            <p>Pre Statements:</p>
            <Input.TextArea value={currentNode.getData().pre_statements?.join('\n')} onChange={e => currentNode.setData({ ...currentNode.getData(), pre_statements: e.target.value.split('\n') })} rows={2} />
            <p>Post Statements:</p>
            <Input.TextArea value={currentNode.getData().post_statements?.join('\n')} onChange={e => currentNode.setData({ ...currentNode.getData(), post_statements: e.target.value.split('\n') })} rows={2} />
            <p>Display Rows:</p>
            <Input type="number" value={currentNode.getData().display_rows} onChange={e => currentNode.setData({ ...currentNode.getData(), display_rows: Number(e.target.value) })} />
          </>
        )}
        {currentNode?.getData().taskType === 'HTTP' && (
          <>
            <p>URL:</p>
            <Input value={currentNode.getData().url} onChange={e => currentNode.setData({ ...currentNode.getData(), url: e.target.value })} />
            <p>HTTP Method:</p>
            <Input value={currentNode.getData().http_method} onChange={e => currentNode.setData({ ...currentNode.getData(), http_method: e.target.value })} />
            <p>HTTP Check Condition:</p>
            <Input value={currentNode.getData().http_check_condition} onChange={e => currentNode.setData({ ...currentNode.getData(), http_check_condition: e.target.value })} />
            <p>Condition:</p>
            <Input value={currentNode.getData().condition} onChange={e => currentNode.setData({ ...currentNode.getData(), condition: e.target.value })} />
            <p>Connect Timeout (ms):</p>
            <Input type="number" value={currentNode.getData().connect_timeout} onChange={e => currentNode.setData({ ...currentNode.getData(), connect_timeout: Number(e.target.value) })} />
            <p>Socket Timeout (ms):</p>
            <Input type="number" value={currentNode.getData().socket_timeout} onChange={e => currentNode.setData({ ...currentNode.getData(), socket_timeout: Number(e.target.value) })} />
          </>
        )}
        {currentNode?.getData().taskType === 'SUB_PROCESS' && (
          <>
            <p>Workflow Name:</p>
            <Input value={currentNode.getData().workflow_name} onChange={e => currentNode.setData({ ...currentNode.getData(), workflow_name: e.target.value })} />
          </>
        )}
        {currentNode?.getData().taskType === 'SWITCH' && (
          <>
            <p>Conditions:</p>
            {currentNode.getData().switch_condition?.dependTaskList.map((branch: any, index: number) => (
              <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <Input
                  placeholder="Condition"
                  value={branch.condition}
                  onChange={e => {
                    const newBranches = [...currentNode.getData().switch_condition.dependTaskList];
                    newBranches[index].condition = e.target.value;
                    currentNode.setData({ ...currentNode.getData(), switch_condition: { dependTaskList: newBranches } });
                  }}
                />
                <Input
                  placeholder="Task Name"
                  value={branch.task}
                  onChange={e => {
                    const newBranches = [...currentNode.getData().switch_condition.dependTaskList];
                    newBranches[index].task = e.target.value;
                    currentNode.setData({ ...currentNode.getData(), switch_condition: { dependTaskList: newBranches } });
                  }}
                />
              </div>
            ))}
          </>
        )}
        {currentNode?.getData().taskType === 'CONDITIONS' && (
          <>
            <p>Success Task:</p>
            <Input value={currentNode.getData().success_task} onChange={e => currentNode.setData({ ...currentNode.getData(), success_task: e.target.value })} />
            <p>Failed Task:</p>
            <Input value={currentNode.getData().failed_task} onChange={e => currentNode.setData({ ...currentNode.getData(), failed_task: e.target.value })} />
            <p>Operator:</p>
            <Select
              value={currentNode.getData().op}
              onChange={value => currentNode.setData({ ...currentNode.getData(), op: value })}
              style={{ width: '100%' }}
            >
              <Select.Option value="AND">AND</Select.Option>
              <Select.Option value="OR">OR</Select.Option>
            </Select>
            <p>Groups (JSON):</p>
            <Input.TextArea
              rows={6}
              value={JSON.stringify(currentNode.getData().groups, null, 2)}
              onChange={e => {
                try {
                  const groups = JSON.parse(e.target.value);
                  currentNode.setData({ ...currentNode.getData(), groups });
                } catch (err) {
                  // Ignore invalid JSON
                }
              }}
            />
          </>
        )}
      </Modal>
      <Modal
        title="Workflow YAML"
        open={isYamlModalVisible}
        onCancel={() => setIsYamlModalVisible(false)}
        footer={[
          <Button key="back" onClick={() => setIsYamlModalVisible(false)}>
            Cancel
          </Button>,
          <Button key="submit" type="primary" onClick={handleSyncYamlToGraph}>
            Sync to Graph
          </Button>,
        ]}
        width={800}
      >
        <Input.TextArea 
          value={yamlContent} 
          onChange={(e) => setYamlContent(e.target.value)} 
          rows={20} 
          style={{ fontFamily: 'monospace', background: '#f5f5f5' }} 
        />
      </Modal>
    </div>
  );
};

export default WorkflowEditorPage;
