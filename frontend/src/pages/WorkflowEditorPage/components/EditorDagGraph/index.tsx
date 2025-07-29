import React, { useEffect } from 'react';
import { useGraph } from '../../../../hooks/useGraph';

interface EditorDagGraphProps {
  container: HTMLDivElement | null;
  onBlankContextMenu: (e: any, x: number, y: number) => void;
  onEdgeDoubleClick: (edge: any) => void;
  onNodeDoubleClick: (args: { node: any }) => void;
  setGraphInstance: (graph: any) => void;
  setLoadGraphData: (loadGraphData: any) => void;
  setAutoLayout: (autoLayout: any) => void;
}

const EditorDagGraph: React.FC<EditorDagGraphProps> = ({
  container,
  onBlankContextMenu,
  onEdgeDoubleClick,
  onNodeDoubleClick,
  setGraphInstance,
  setLoadGraphData,
  setAutoLayout,
}) => {
  const { graph, loadGraphData, autoLayout } = useGraph({
    container: container,
    onBlankContextMenu: onBlankContextMenu,
    onEdgeDoubleClick: onEdgeDoubleClick,
  });

  useEffect(() => {
    if (graph) {
      setGraphInstance(graph);
      setLoadGraphData(() => loadGraphData);
      setAutoLayout(() => autoLayout);
      graph.on('node:dblclick', onNodeDoubleClick);

      return () => {
        graph.off('node:dblclick', onNodeDoubleClick);
      };
    }
  }, [graph, onNodeDoubleClick, setGraphInstance, setLoadGraphData, setAutoLayout, loadGraphData, autoLayout]);

  return <div ref={container as any} style={{ width: '100%', height: '100%' }} />;
};

export default EditorDagGraph;
