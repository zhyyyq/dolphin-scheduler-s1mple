import React, { useEffect } from 'react';
import { useGraph } from '../../../../hooks/useGraph';

interface EditorDagGraphProps {
  onBlankContextMenu: (e: any, x: number, y: number) => void;
  onEdgeDoubleClick: (edge: any) => void;
  onNodeDoubleClick: (args: { node: any }) => void;
  setGraphInstance: (graph: any) => void;
  setLoadGraphData: (loadGraphData: any) => void;
  setAutoLayout: (autoLayout: any) => void;
}

const EditorDagGraph: React.FC<EditorDagGraphProps> = ({
  onBlankContextMenu,
  onEdgeDoubleClick,
  onNodeDoubleClick,
  setGraphInstance,
  setLoadGraphData,
  setAutoLayout,
}) => {
  const [container, setContainer] = React.useState<HTMLDivElement | null>(null);
  const containerRefCallback = React.useCallback((node: HTMLDivElement) => {
    if (node) {
      setContainer(node);
    }
  }, []);

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

  return <div ref={containerRefCallback} style={{ width: '100%', height: '100%' }} />;
};

export default EditorDagGraph;
