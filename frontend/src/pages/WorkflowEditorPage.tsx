import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Graph } from '@antv/x6';
import { Stencil } from '@antv/x6-plugin-stencil';
import { Button, Modal, Input, App as AntApp } from 'antd';
import * as yaml from 'js-yaml';
import '../components/TaskNode'; // Register custom node
import { Task } from '../types';
import api from '../api';

const WorkflowEditorPage: React.FC = () => {
  const navigate = useNavigate();
  const { message } = AntApp.useApp();
  const containerRef = useRef<HTMLDivElement>(null);
  const stencilContainerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentNode, setCurrentNode] = useState<any>(null);
  const [nodeName, setNodeName] = useState('');
  const [nodeCommand, setNodeCommand] = useState('');
  const [workflowName, setWorkflowName] = useState('my-workflow');

  useEffect(() => {
    if (containerRef.current && !graphRef.current) {
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
          createEdge() {
            return this.createEdge({
              shape: 'edge',
              attrs: {
                line: {
                  stroke: '#8f8f8f',
                  strokeWidth: 1,
                },
              },
              zIndex: -1,
            });
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

      graphRef.current = graph;

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
    }
  }, []);

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
        });
        message.success('Workflow saved successfully!');
        navigate('/');
      } catch (error) {
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
        <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 10, display: 'flex', alignItems: 'center', background: 'white', padding: '8px', borderRadius: '6px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <span style={{ marginRight: '8px', fontWeight: '500' }}>Workflow Name:</span>
          <Input value={workflowName} onChange={e => setWorkflowName(e.target.value)} style={{ width: '200px' }} />
        </div>
        <div ref={containerRef} style={{ width: '100%', height: '100%' }}></div>
        <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 10 }}>
          <Button type="primary" onClick={handleSave}>Save Workflow</Button>
        </div>
      </div>
      <Modal title="Edit Task" open={isModalVisible} onOk={handleOk} onCancel={handleCancel}>
        <p>Name:</p>
        <Input value={nodeName} onChange={e => setNodeName(e.target.value)} />
        <p>Command:</p>
        <Input.TextArea value={nodeCommand} onChange={e => setNodeCommand(e.target.value)} rows={4} />
      </Modal>
    </div>
  );
};

export default WorkflowEditorPage;
