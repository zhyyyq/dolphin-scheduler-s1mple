import { useEffect, useRef, useState, useCallback } from 'react';
import { Graph } from '@antv/x6';
import { Keyboard } from '@antv/x6-plugin-keyboard';
import { Selection } from '@antv/x6-plugin-selection';
import dagre from 'dagre';
import { History } from '@antv/x6-plugin-history';
import { Task } from '../types';

interface UseGraphProps {
  container: HTMLDivElement | null;
  onNodeDoubleClick: (node: any) => void;
  onBlankContextMenu: (e: any, x: number, y: number) => void;
}

export const useGraph = ({ container, onNodeDoubleClick, onBlankContextMenu }: UseGraphProps) => {
  const [graph, setGraph] = useState<Graph | null>(null);
  const graphRef = useRef<Graph | null>(null);

  useEffect(() => {
    if (!container || graphRef.current) return;

    const graphInstance = new Graph({
      container,
      autoResize: true,
      panning: true,
      mousewheel: true,
      background: { color: '#F2F7FA' },
      connecting: {
        router: 'manhattan',
        connector: { name: 'rounded', args: { radius: 8 } },
        anchor: 'center',
        connectionPoint: 'anchor',
        allowBlank: false,
        allowMulti: 'withPort',
        snap: { radius: 20 },
        createEdge() {
          return this.createEdge({
            attrs: {
              line: {
                stroke: '#8f8f8f',
                strokeWidth: 1,
              },
            },
            zIndex: -1,
          });
        },
      },
      highlighting: {
        magnetAdsorbed: {
          name: 'stroke',
          args: { attrs: { fill: '#fff', stroke: '#31d0c6', strokeWidth: 4 } },
        },
      },
    });

    graphInstance.use(new Selection({ enabled: true, rubberband: true, showNodeSelectionBox: true, showEdgeSelectionBox: true }));
    graphInstance.use(new Keyboard({ enabled: true, global: true }));
    graphInstance.use(new History({ enabled: true }));

    graphRef.current = graphInstance;
    setGraph(graphInstance);

    graphInstance.bindKey(['delete', 'backspace'], () => {
      const selectedCells = graphInstance.getSelectedCells();
      if (selectedCells.length) {
        graphInstance.removeCells(selectedCells);
      }
    });

    graphInstance.bindKey('ctrl+z', () => graphInstance.undo());
    graphInstance.bindKey('ctrl+y', () => graphInstance.redo());

    graphInstance.on('node:dblclick', ({ node }) => onNodeDoubleClick(node));
    graphInstance.on('blank:contextmenu', ({ e, x, y }) => onBlankContextMenu(e, x, y));
    graphInstance.on('node:contextmenu', ({ e }) => e.preventDefault());
    graphInstance.on('edge:contextmenu', ({ e }) => e.preventDefault());


    graphInstance.on('node:added', ({ node }) => {
      const allNodes = graphInstance.getNodes();
      const baseName = node.getData().label;
      let newName = baseName;
      let counter = 1;
      while (allNodes.some(n => n.getData().label === newName && n.id !== node.id)) {
        newName = `${baseName}-${counter}`;
        counter++;
      }
      if (newName !== baseName) {
        node.setData({ ...node.getData(), label: newName });
      }
    });

    return () => {
      graphInstance.dispose();
    };
  }, [container, onNodeDoubleClick, onBlankContextMenu]);

  const loadGraphData = useCallback((tasks: Task[], relations: { from: string; to: string }[] = []) => {
    const currentGraph = graphRef.current;
    if (!currentGraph) return;

    currentGraph.clearCells(); // Clear previous data before loading new
    const nodeMap = new Map();
    tasks.forEach((task) => {
      const rawType = task.type || task.task_type;
      let displayType = rawType;
      if (rawType === 'SubWorkflow') {
        displayType = 'SUB_PROCESS';
      }

      const node = currentGraph.createNode({
        shape: 'task-node',
        data: {
          ...task,
          label: task.name,
          _display_type: displayType,
        },
      });
      currentGraph.addNode(node);
      nodeMap.set(task.name, node);
    });

    tasks.forEach(task => {
      if (task.deps && task.deps.length > 0) {
        task.deps.forEach((dep: string) => {
          const sourceNode = nodeMap.get(dep);
          const targetNode = nodeMap.get(task.name);
          if (sourceNode && targetNode) {
            currentGraph.addEdge({
              shape: 'edge',
              source: { cell: sourceNode.id, port: 'bottom' },
              target: { cell: targetNode.id, port: 'top' },
              attrs: { line: { stroke: '#8f8f8f', strokeWidth: 1 } },
              zIndex: -1,
            });
          }
        });
      }

      if ((task.task_type === 'Switch' || task.type === 'Switch') && Array.isArray(task.condition)) {
        task.condition.forEach((cond: any) => {
          const sourceNode = nodeMap.get(task.name);
          const targetNode = nodeMap.get(cond.task);
          if (sourceNode && targetNode) {
            currentGraph.addEdge({
              shape: 'edge',
              source: { cell: sourceNode.id, port: 'bottom' },
              target: { cell: targetNode.id, port: 'top' },
              attrs: { line: { stroke: '#8f8f8f', strokeWidth: 1 } },
              zIndex: -1,
            });
          }
        });
      }
    });

    const nodes = currentGraph.getNodes();
    const edges = currentGraph.getEdges();
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
      const node = currentGraph.getCellById(id) as any;
      if (node) {
        const pos = g.node(id);
        node.position(pos.x, pos.y);
      }
    });

    currentGraph.centerContent();
  }, []);

  const autoLayout = useCallback(() => {
    const currentGraph = graphRef.current;
    if (!currentGraph) return;

    const nodes = currentGraph.getNodes();
    const edges = currentGraph.getEdges();
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
      const node = currentGraph.getCellById(id) as any;
      if (node) {
        const pos = g.node(id);
        node.position(pos.x, pos.y);
      }
    });

    currentGraph.centerContent();
  }, []);

  return { graph, loadGraphData, autoLayout };
};
