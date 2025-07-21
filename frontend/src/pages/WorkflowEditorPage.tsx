import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Graph } from '@antv/x6';
import { Stencil } from '@antv/x6-plugin-stencil';
import { Keyboard } from '@antv/x6-plugin-keyboard';
import { Selection } from '@antv/x6-plugin-selection';
import { History } from '@antv/x6-plugin-history';
import { Button, Modal, Input, App as AntApp } from 'antd';
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
          allowMulti: 'withPort',
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
          stencilGraphHeight: 180,
          collapsable: true,
          groups: [
            {
              name: 'group1',
              title: 'Tasks',
            },
          ],
          layoutOptions: {
            columns: 1,
            columnWidth: 180,
            rowHeight: 55,
          },
        });

        stencilContainerRef.current.appendChild(stencil.container);

        const shellNode = graph.createNode({
          shape: 'task-node',
          data: {
            label: 'Shell Task',
            taskType: 'SHELL',
            command: 'echo "Hello"',
          },
          ports: {
            items: [
              { id: 'in', group: 'left' },
              { id: 'out', group: 'right' },
            ]
          }
        });

        stencil.load([shellNode], 'group1');
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
          setWorkflowName(name.replace(/\.yaml$/, '').replace(/\.yml$/, ''));
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
                command: task.command,
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
          schedule: workflowSchedule,
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
            command: task.command,
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
      // Check for duplicate workflow name
      try {
        const [dsWorkflows, localWorkflows] = await Promise.all([
          api.get<Workflow[]>('/api/workflows'),
          api.get<Workflow[]>('/api/workflows/local')
        ]);
        const allWorkflows = [...dsWorkflows, ...localWorkflows];
        const isDuplicate = allWorkflows.some(
          (wf) => wf.name === workflowName && wf.uuid !== workflowUuid
        );

        if (isDuplicate) {
          message.error('A workflow with this name already exists.');
          return;
        }
      } catch (error) {
        message.error('Failed to verify workflow name. Please try again.');
        return;
      }

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
          schedule: workflowSchedule,
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
      <div ref={stencilContainerRef} style={{ width: '250px', borderRight: '1px solid #dfe3e8', position: 'relative' }}></div>
      <div style={{ flex: 1, position: 'relative' }}>
        <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '8px', background: 'white', padding: '8px', borderRadius: '6px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: '8px', fontWeight: '500', width: '120px' }}>Workflow Name:</span>
            <Input value={workflowName} onChange={e => setWorkflowName(e.target.value)} style={{ width: '200px' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: '8px', fontWeight: '500', width: '120px' }}>Schedule (Cron):</span>
            <Input value={workflowSchedule} onChange={e => setWorkflowSchedule(e.target.value)} style={{ width: '200px' }} />
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
        <p>Command:</p>
        <Input.TextArea value={nodeCommand} onChange={e => setNodeCommand(e.target.value)} rows={4} />
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
