import React, { useEffect, useRef } from 'react';
import { Graph } from '@antv/x6';
import './TaskNode'; // Import to register the custom node

// A simple layout algorithm to position nodes without an external library.
const simpleLayout = (data) => {
  const nodes = JSON.parse(JSON.stringify(data.tasks));
  const edges = JSON.parse(JSON.stringify(data.relations));

  const nodeMap = new Map(nodes.map(node => [node.name, { ...node, inDegree: 0, outDegree: 0, level: 0 }]));

  for (const edge of edges) {
    if (nodeMap.has(edge.from)) {
      nodeMap.get(edge.from).outDegree++;
    }
    if (nodeMap.has(edge.to)) {
      nodeMap.get(edge.to).inDegree++;
    }
  }

  const queue = [];
  for (const [id, node] of nodeMap.entries()) {
    if (node.inDegree === 0) {
      queue.push(id);
    }
  }

  const levels = new Map();
  let maxLevel = 0;
  while (queue.length > 0) {
    const u = queue.shift();
    const uNode = nodeMap.get(u);
    
    if (!levels.has(uNode.level)) {
      levels.set(uNode.level, []);
    }
    levels.get(uNode.level).push(u);
    maxLevel = Math.max(maxLevel, uNode.level);

    for (const edge of edges) {
      if (edge.from === u) {
        const vNode = nodeMap.get(edge.to);
        vNode.inDegree--;
        if (vNode.inDegree === 0) {
          vNode.level = uNode.level + 1;
          queue.push(edge.to);
        }
      }
    }
  }

  const x_gap = 300;
  const y_gap = 150;
  const laidOutNodes = [];

  for (const [level, nodesInLevel] of levels.entries()) {
    const y_offset = (nodesInLevel.length - 1) * y_gap / 2;
    nodesInLevel.forEach((nodeId, i) => {
      laidOutNodes.push({
        id: nodeId,
        x: level * x_gap + 50,
        y: i * y_gap + 50 - y_offset,
        data: nodeMap.get(nodeId),
      });
    });
  }

  return laidOutNodes;
};


const DagGraph = ({ data, onNodeDoubleClick }) => {
  const containerRef = useRef(null);
  const graphRef = useRef(null);

  // Effect for initializing and cleaning up the graph
  useEffect(() => {
    if (containerRef.current && !graphRef.current) {
      const graph = new Graph({
        container: containerRef.current,
        panning: true,
        mousewheel: true,
        autoResize: true,
        background: { color: '#f0f2f5' },
        connecting: {
          snap: true,
          router: 'manhattan',
          connector: 'rounded',
        },
      });
      graphRef.current = graph;
    }
    
    return () => {
      if (graphRef.current) {
        graphRef.current.dispose();
        graphRef.current = null;
      }
    };
  }, []);

  // Effect for handling events
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || !onNodeDoubleClick) return;

    const handler = ({ node }) => onNodeDoubleClick(node.getData());
    graph.on('node:dblclick', handler);

    return () => {
      graph.off('node:dblclick', handler);
    };
  }, [onNodeDoubleClick]);

  // Effect for updating the graph with new data
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;

    if (!data || !data.tasks || data.tasks.length === 0) {
      graph.clearCells();
      return;
    }

    const laidOutNodes = simpleLayout(data);
    const model = {
      nodes: laidOutNodes.map(node => ({
        id: node.id,
        x: node.x,
        y: node.y,
        shape: 'custom-react-node',
        data: node.data,
      })),
      edges: data.relations.map(rel => ({
        source: rel.from,
        target: rel.to,
        attrs: { line: { stroke: '#8f8f8f', strokeWidth: 1 } },
        zIndex: -1,
      })),
    };

    graph.fromJSON(model);
    graph.centerContent();

  }, [data]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
};

export default DagGraph;
