import React, { useEffect, useRef } from 'react';
import { Graph, Node } from '@antv/x6';
import dagre from 'dagre';

interface NodeData {
  id: string;
  label: string;
  style?: {
    fill: string;
    stroke: string;
  };
  data: any;
}

interface EdgeData {
  source: string;
  target: string;
}

interface InstanceDagGraphProps {
  nodes: NodeData[];
  edges: EdgeData[];
  onNodeClick?: (nodeData: any) => void;
}

const InstanceDagGraph: React.FC<InstanceDagGraphProps> = ({ nodes, edges, onNodeClick }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);

  const layout = (graph: Graph) => {
    const graphNodes = graph.getNodes();
    const graphEdges = graph.getEdges();
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: 'TB', nodesep: 40, ranksep: 80 });
    g.setDefaultEdgeLabel(() => ({}));

    const width = 180;
    const height = 36;
    graphNodes.forEach((node) => {
      g.setNode(node.id, { width, height });
    });

    graphEdges.forEach((edge) => {
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
        interacting: {
          nodeMovable: false,
        },
      });
      graphRef.current = graph;

      if (onNodeClick) {
        graph.on('node:click', ({ node }) => {
          onNodeClick(node.getData());
        });
      }
    }
    
    return () => {
      if (graphRef.current) {
        graphRef.current.dispose();
        graphRef.current = null;
      }
    };
  }, [onNodeClick]);

  useEffect(() => {
    if (graphRef.current && nodes && edges) {
      const graphNodes = nodes.map(node => ({
        id: node.id,
        shape: 'rect',
        width: 180,
        height: 36,
        label: node.label,
        data: node.data,
        attrs: {
          body: {
            fill: node.style?.fill || '#e6f7ff',
            stroke: node.style?.stroke || '#1890ff',
            strokeWidth: 1,
            rx: 5,
            ry: 5,
          },
          label: {
            fill: '#000',
            fontSize: 14,
          },
        },
      }));
      const graphEdges = edges.map(edge => ({
        source: edge.source,
        target: edge.target,
        attrs: {
          line: {
            stroke: '#8f8f8f',
            strokeWidth: 1,
            targetMarker: 'classic',
          },
        },
      }));
      graphRef.current.fromJSON({ nodes: graphNodes, edges: graphEdges });
      layout(graphRef.current);
    }
  }, [nodes, edges]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
};

export default InstanceDagGraph;
