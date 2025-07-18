import React, { useEffect, useRef } from 'react';
import { Graph } from '@antv/x6';

// A simple layout algorithm to position nodes without an external library.
const simpleLayout = (data) => {
  const nodes = JSON.parse(JSON.stringify(data.tasks));
  const edges = JSON.parse(JSON.stringify(data.relations));

  const nodeMap = new Map(nodes.map(node => [node, { id: node, inDegree: 0, outDegree: 0, level: 0 }]));

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

  const x_gap = 200;
  const y_gap = 80;
  const laidOutNodes = [];

  for (const [level, nodesInLevel] of levels.entries()) {
    const y_offset = (nodesInLevel.length - 1) * y_gap / 2;
    nodesInLevel.forEach((nodeId, i) => {
      laidOutNodes.push({
        id: nodeId,
        x: level * x_gap + 50,
        y: i * y_gap + 50 - y_offset,
      });
    });
  }

  return laidOutNodes;
};


const DagGraph = ({ data }) => {
  const containerRef = useRef(null);
  const graphRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !data || !data.tasks || data.tasks.length === 0) {
      return;
    }

    if (graphRef.current) {
      graphRef.current.dispose();
    }

    const graph = new Graph({
      container: containerRef.current,
      panning: true,
      mousewheel: true,
      autoResize: true,
      background: {
        color: '#F2F7FA',
      },
      connecting: {
        snap: true,
      },
    });
    graphRef.current = graph;

    const laidOutNodes = simpleLayout(data);

    const model = {
      nodes: laidOutNodes.map(node => ({
        ...node,
        shape: 'rect',
        width: 150,
        height: 40,
        label: node.id,
        attrs: {
          body: { stroke: '#8f8f8f', strokeWidth: 1, fill: '#fff', rx: 6, ry: 6 },
        },
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

    return () => {
      if (graphRef.current) {
        graphRef.current.dispose();
        graphRef.current = null;
      }
    };
  }, [data]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
};

export default DagGraph;
