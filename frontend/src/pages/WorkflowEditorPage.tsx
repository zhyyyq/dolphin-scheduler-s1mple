import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Graph } from '@antv/x6';
import { Stencil } from '@antv/x6-plugin-stencil';
import { Keyboard } from '@antv/x6-plugin-keyboard';
import { Selection } from '@antv/x6-plugin-selection';
import { Button, Modal, Input, App as AntApp } from 'antd';
import * as yaml from 'js-yaml';
import '../components/TaskNode'; // Register custom node
import { Task } from '../types';
import api from '../api';

const WorkflowEditorPage: React.FC = () => {
  const navigate = useNavigate();
  const { projectCode, workflowCode } = useParams<{ projectCode: string; workflowCode: string }>();
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
          router: 'manhattan',
          connector: {
            name: 'rounded',
            args: {
              radius: 8,
            },
          },
          anchor: 'center',
          connectionPoint: 'anchor',
          allowBlank: false,
          snap: {
            radius: 20,
          },
          validateConnection({ sourceView, targetView, sourceMagnet, targetMagnet }) {
            // 确保连接桩不为空
            if (!sourceMagnet || !targetMagnet) {
              return false;
            }
            // 只能从输出连接桩连接到输入连接桩
            if (sourceMagnet.getAttribute('port-group') === 'in' || targetMagnet.getAttribute('port-group') === 'out') {
              return false;
            }
            // 不能连接到自身
            if (sourceView === targetView) {
              return false;
            }
            return true;
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
        }),
      );

      graph.use(
        new Keyboard({
          enabled: true,
          global: true,
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
              { group: 'in' },
              { group: 'out' },
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

      if (projectCode && workflowCode) {
        try {
          const response = await api.get<{ name: string; tasks: Task[]; relations: { from: string; to: string }[] }>(`/api/project/${projectCode}/workflow/${workflowCode}`);
          const { name, tasks, relations } = response;
          setWorkflowName(name.replace(/\.yaml$/, '').replace(/\.yml$/, ''));

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
              ports: { items: [{ group: 'in' }, { group: 'out' }] }
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
  }, [projectCode, workflowCode, message]);

  const handleOk = () => {
    if (currentNode) {
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

      const workflow = {
        workflow: {
          name: workflowName,
          schedule: '0 0 0 * * ? *',
        },
        tasks,
      };

      const yamlStr = yaml.dump(workflow);
      setYamlContent(yamlStr);
      setIsYamlModalVisible(true);
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

      const workflow = {
        workflow: {
          name: workflowName,
          schedule: '0 0 0 * * ? *',
        },
        tasks,
      };

      const yamlStr = yaml.dump(workflow);
      
      try {
        await api.post('/api/workflow/yaml', {
          name: workflow.workflow.name,
          content: yamlStr,
          original_filename: projectCode === 'local' ? workflowCode : undefined,
        });
        message.success('Workflow saved successfully!');
        navigate('/');
      } catch (error: any) {
        if (error && error.status === 409) {
          message.error(`Error: ${error.message}`);
        } else {
          const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
          message.error(`Error: ${errorMessage}`);
        }
        console.error('Error saving workflow:', error);
      }
    }
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)' }}>
      <div ref={stencilContainerRef} style={{ width: '250px', borderRight: '1px solid #dfe3e8', position: 'relative' }}></div>
      <div style={{ flex: 1, position: 'relative' }}>
        <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 10, display: 'flex', alignItems: 'center', background: 'white', padding: '8px', borderRadius: '6px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <span style={{ marginRight: '8px', fontWeight: '500' }}>Workflow Name:</span>
          <Input value={workflowName} onChange={e => setWorkflowName(e.target.value)} style={{ width: '200px' }} />
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
            Close
          </Button>,
        ]}
        width={800}
      >
        <Input.TextArea value={yamlContent} readOnly rows={20} style={{ fontFamily: 'monospace', background: '#f5f5f5' }} />
      </Modal>
    </div>
  );
};

export default WorkflowEditorPage;
