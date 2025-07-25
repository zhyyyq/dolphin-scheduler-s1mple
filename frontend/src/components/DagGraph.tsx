import React, { useEffect, useRef } from 'react';
import { Graph, Node } from '@antv/x6';
import { PreviewData, Task } from '../types';
import dagre from 'dagre';
import api from '../api';

interface DagGraphProps {
  data: PreviewData | null;
  onNodeDoubleClick?: (node: Task) => void;
}

const DagGraph: React.FC<DagGraphProps> = ({ data, onNodeDoubleClick }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);

  const layout = (graph: Graph) => {
    const nodes = graph.getNodes();
    const edges = graph.getEdges();
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: 'TB', nodesep: 40, ranksep: 80 });
    g.setDefaultEdgeLabel(() => ({}));

    const width = 180;
    const height = 36;
    nodes.forEach((node) => {
      g.setNode(node.id, { width, height });
    });

    edges.forEach((edge) => {
      const source = edge.getSource() as any;
      const target = edge.getTarget() as any;
      if (source && target && source.cell && target.cell) {
        g.setEdge(source.cell, target.cell);
      }
    });

    dagre.layout(g);

    g.nodes().forEach((id) => {
      const node = graph.getCellById(id) as Node;
      if (node) {
        const pos = g.node(id);
        node.position(pos.x, pos.y);
      }
    });

    graph.centerContent();
  };

  const transformData = (graphData: PreviewData) => {
    const nodes = graphData.tasks.map(task => {
      const nodeConfig: any = {
        id: task.name,
        shape: 'task-node',
        width: 180,
        height: 36,
        data: {
          label: task.name,
          task_type: task.task_type,
          command: task.command,
        },
      };

      if (task.task_type === 'CONDITIONS') {
        nodeConfig.ports = {
          groups: {
            in: {
              position: 'top',
              attrs: { circle: { r: 4, magnet: true, stroke: '#5F95FF', strokeWidth: 1, fill: '#fff' } },
            },
            out: {
              position: 'bottom',
              attrs: {
                circle: {
                  r: 4,
                  magnet: true,
                  stroke: '#5F95FF',
                  strokeWidth: 1,
                  fill: '#fff',
                },
              },
              label: {
                position: 'bottom',
              }
            },
          },
          items: [
            { id: 'in', group: 'in' },
            { id: 'success', group: 'out', args: { dx: -40 }, attrs: { text: { text: 'Success', fill: '#52c41a' } } },
            { id: 'failure', group: 'out', args: { dx: 40 }, attrs: { text: { text: 'Failure', fill: '#ff4d4f' } } },
          ],
        };
      }

      return nodeConfig;
    });
    const edges = graphData.relations.map(rel => ({
      source: { cell: rel.from, port: rel.from_port },
      target: { cell: rel.to, port: rel.to_port },
      attrs: {
        line: {
          stroke: '#8f8f8f',
          strokeWidth: 1,
        },
      },
    }));
    return { nodes, edges };
  };

  useEffect(() => {
    if (!graphRef.current && containerRef.current) {
      const graph = new Graph({
        container: containerRef.current,
        autoResize: true,
        panning: true,
        mousewheel: true,
        background: {
          color: '#F2F7FA',
        },
        connecting: {
          snap: true,
        },
        interacting: {
          nodeMovable: false,
        },
      });
      graphRef.current = graph;

      if (onNodeDoubleClick) {
        graph.on('node:dblclick', ({ node }) => {
          const { label, command, taskType } = node.getData();
          onNodeDoubleClick({ name: label, command, type: taskType });
        });
      }

      graph.on('node:contextmenu', async ({ node, e }) => {
        e.preventDefault();
        const { label, command, taskType } = node.getData();
        if (taskType === 'sub-process') {
          // Handle sub-process context menu
        } else {
          const newWorkflow = await api.reparseWorkflow(command);
          console.log(newWorkflow);
        }
      });
    }
    
    return () => {
      if (graphRef.current) {
        graphRef.current.dispose();
        graphRef.current = null;
      }
    };
  }, [onNodeDoubleClick]);

  useEffect(() => {
    if (graphRef.current && data) {
      const { nodes, edges } = transformData(data);
      graphRef.current.fromJSON({ nodes, edges });
      layout(graphRef.current);
    }
  }, [data]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
};

export default DagGraph;
