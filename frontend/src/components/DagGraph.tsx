import React, { useEffect, useRef } from 'react';
import { Graph } from '@antv/x6';
import { DagreLayout } from '@antv/layout';
import { PreviewData, Task } from '../types';
import './TaskNode'; // Ensure the custom node is registered

interface DagGraphProps {
  data: PreviewData | null;
  onNodeDoubleClick?: (node: Task) => void;
}

const DagGraph: React.FC<DagGraphProps> = ({ data, onNodeDoubleClick }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);

  const transformData = (graphData: PreviewData) => {
    const nodes = graphData.tasks.map(task => ({
      id: task.name,
      shape: 'task-node',
      data: {
        label: task.name,
        taskType: task.type,
        command: task.command,
      },
    }));
    const edges = graphData.relations.map(rel => ({
      source: rel.from,
      target: rel.to,
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
      });
      graphRef.current = graph;

      if (onNodeDoubleClick) {
        graph.on('node:dblclick', ({ node }) => {
          const { label, command, taskType } = node.getData();
          onNodeDoubleClick({ name: label, command, type: taskType });
        });
      }
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
      
      const dagreLayout = new DagreLayout({});

      const model = { nodes, edges };
      // The layout method is available on the instance despite the type error,
      // which is likely due to an issue with the type definitions in the beta version.
      const newModel = (dagreLayout as any).layout(model);
      
      graphRef.current.fromJSON(newModel);
      graphRef.current.centerContent();
    }
  }, [data]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
};

export default DagGraph;
