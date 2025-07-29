import React, { useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useGraph } from '../../../../hooks/useGraph';
import { AppDispatch } from '../../../../store';
import {
  setContextMenu,
  setCurrentEdge,
  handleNodeDoubleClick as handleNodeDoubleClickThunk,
  setGraph,
} from '../../../../store/slices/workflowEditorSlice';

const EditorDagGraph: React.FC = () => {
  const dispatch: AppDispatch = useDispatch();

  const onBlankContextMenu = useCallback((e: any, x: number, y: number) => {
    e.preventDefault();
    dispatch(setContextMenu({ visible: true, x: e.clientX, y: e.clientY, px: x, py: y }));
  }, [dispatch]);

  const onEdgeDoubleClick = useCallback((edge: any) => {
    const sourceNode = edge.getSourceNode();
    if (sourceNode && sourceNode.getData().type === 'SWITCH') {
      dispatch(setCurrentEdge(edge));
    }
  }, [dispatch]);

  const onNodeDoubleClick = useCallback((args: { node: any }) => {
    dispatch(handleNodeDoubleClickThunk(args));
  }, [dispatch]);
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
      dispatch(setGraph(graph));
      graph.on('node:dblclick', onNodeDoubleClick);

      return () => {
        graph.off('node:dblclick', onNodeDoubleClick);
      };
    }
  }, [graph, onNodeDoubleClick, dispatch]);

  return <div ref={containerRefCallback} style={{ width: '100%', height: '100%' }} />;
};

export default EditorDagGraph;
