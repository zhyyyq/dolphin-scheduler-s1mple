import { useEffect, useRef } from 'react';
import { Graph } from '@antv/x6';
import { Keyboard } from '@antv/x6-plugin-keyboard';
import { Selection } from '@antv/x6-plugin-selection';
import { History } from '@antv/x6-plugin-history';
import { Task } from '../types';

interface UseGraphProps {
  container: HTMLDivElement | null;
  onNodeDoubleClick: (node: any) => void;
  onBlankContextMenu: (e: any, x: number, y: number) => void;
}

export const useGraph = ({ container, onNodeDoubleClick, onBlankContextMenu }: UseGraphProps) => {
  const graphRef = useRef<Graph | null>(null);

  useEffect(() => {
    if (!container || graphRef.current) return;

    const graph = new Graph({
      container,
      autoResize: true,
      panning: true,
      mousewheel: true,
      background: { color: '#F2F7FA' },
      connecting: {
        router: 'metro',
        connector: { name: 'rounded', args: { radius: 8 } },
        anchor: 'center',
        connectionPoint: 'anchor',
        allowBlank: false,
        allowMulti: true,
        allowNode: true,
        snap: { radius: 20 },
      },
      highlighting: {
        magnetAdsorbed: {
          name: 'stroke',
          args: { attrs: { fill: '#fff', stroke: '#31d0c6', strokeWidth: 4 } },
        },
      },
    });

    graph.use(new Selection({ enabled: true, rubberband: true, showNodeSelectionBox: true, showEdgeSelectionBox: true }));
    graph.use(new Keyboard({ enabled: true, global: true }));
    graph.use(new History({ enabled: true }));

    graphRef.current = graph;

    graph.bindKey(['delete', 'backspace'], () => {
      const selectedCells = graph.getSelectedCells();
      if (selectedCells.length) {
        graph.removeCells(selectedCells);
      }
    });

    graph.bindKey('ctrl+z', () => graph.undo());
    graph.bindKey('ctrl+y', () => graph.redo());

    graph.on('node:dblclick', ({ node }) => onNodeDoubleClick(node));
    graph.on('blank:contextmenu', ({ e, x, y }) => onBlankContextMenu(e, x, y));
    graph.on('node:contextmenu', ({ e }) => e.preventDefault());
    graph.on('edge:contextmenu', ({ e }) => e.preventDefault());

    graph.on('node:added', ({ node }) => {
      const allNodes = graph.getNodes();
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
      graph.dispose();
    };
  }, [container, onNodeDoubleClick, onBlankContextMenu]);

  const loadGraphData = (tasks: Task[], relations: { from: string; to: string }[]) => {
    const graph = graphRef.current;
    if (!graph) return;

    const nodeMap = new Map();
    tasks.forEach((task, index) => {
      const node = graph.createNode({
        shape: 'task-node',
        x: (index % 4) * 250,
        y: Math.floor(index / 4) * 150,
        data: { label: task.name, taskType: task.type, ...task },
        ports: { items: [{ id: 'in', group: 'left' }, { id: 'out', group: 'right' }] }
      });
      graph.addNode(node);
      nodeMap.set(task.name, node);
    });

    relations.forEach(rel => {
      const sourceNode = nodeMap.get(rel.from);
      const targetNode = nodeMap.get(rel.to);
      if (sourceNode && targetNode) {
        graph.addEdge({
          source: sourceNode,
          target: targetNode,
          shape: 'edge',
          attrs: { line: { stroke: '#8f8f8f', strokeWidth: 1 } },
          zIndex: -1,
        });
      }
    });
    graph.centerContent();
  };

  return { graph: graphRef.current, loadGraphData };
};
