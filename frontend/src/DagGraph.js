import React, { useEffect, useRef } from 'react';
import { Graph } from '@antv/x6';
import { DagreLayout } from '@antv/layout';

const DagGraph = ({ data }) => {
  const containerRef = useRef(null);
  // Keep a reference to the graph instance to dispose it correctly
  const graphRef = useRef(null);

  useEffect(() => {
    const initializeGraph = async () => {
      if (!containerRef.current || !data) {
        return;
      }

      // Dispose the previous graph instance if it exists
      if (graphRef.current) {
        graphRef.current.dispose();
      }

      const graph = new Graph({
        container: containerRef.current,
        panning: true,
        mousewheel: true,
        connecting: {
          snap: true,
        },
        autoResize: true,
        background: {
          color: '#F2F7FA',
        },
      });
      graphRef.current = graph;

      const model = {
        nodes: data.tasks.map(task => ({
          id: task,
          shape: 'rect',
          width: 150,
          height: 40,
          label: task,
          attrs: {
            body: {
              stroke: '#8f8f8f',
              strokeWidth: 1,
              fill: '#fff',
              rx: 6,
              ry: 6,
            },
          },
        })),
        edges: data.relations.map(rel => ({
          source: rel.from,
          target: rel.to,
          attrs: {
            line: {
              stroke: '#8f8f8f',
              strokeWidth: 1,
            },
          },
          zIndex: -1,
        })),
      };

      const dagreLayout = new DagreLayout({
        type: 'dagre',
        rankdir: 'LR', // Left to Right
        align: 'UL',
        nodesep: 30,
        ranksep: 40,
      });

      // The layout method can be async, so we await it.
      const newModel = await dagreLayout.layout(model);
      graph.fromJSON(newModel);
      graph.centerContent();
    };

    initializeGraph();

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
