import { useEffect, useRef, useState, useCallback } from 'react';
import { Graph } from '@antv/x6';
import { Keyboard } from '@antv/x6-plugin-keyboard';
import { Selection } from '@antv/x6-plugin-selection';
import dagre from 'dagre';
import { History } from '@antv/x6-plugin-history';
import { Task } from '../types';
import { taskTypes } from '../config/taskTypes';

interface UseGraphProps {
  container: HTMLDivElement | null;
  onNodeDoubleClick?: (node: any) => void;
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
        allowNode: false,
        allowEdge: false,
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

    if (onNodeDoubleClick) {
      graphInstance.on('node:dblclick', ({ node }) => onNodeDoubleClick(node));
    }
    graphInstance.on('blank:contextmenu', ({ e, x, y }) => onBlankContextMenu(e, x, y));
    graphInstance.on('node:contextmenu', ({ e }) => e.preventDefault());
    graphInstance.on('edge:contextmenu', ({ e }) => e.preventDefault());


    graphInstance.on('node:added', ({ node }) => {
      const data = node.getData();
      const allNodes = graphInstance.getNodes();
      const baseName = data.label;
      let newName = baseName;
      let counter = 1;
      while (allNodes.some(n => n.getData().label === newName && n.id !== node.id)) {
        newName = `${baseName}-${counter}`;
        counter++;
      }
      
      const newData = { ...data, label: newName };

      if (!data.type) {
        newData.type = data.task_type;
      }
      
      if (!data.task_params) {
        newData.task_params = {};
      }

      node.setData(newData);
    });

    return () => {
      graphInstance.dispose();
    };
  }, [container, onNodeDoubleClick, onBlankContextMenu]);

  const loadGraphData = useCallback((
    tasks: Task[], 
    relations: { from: string; to: string }[] = [],
    // locations is captured but not used for rendering, per user request.
    locations: { taskCode: string, x: number, y: number }[] | null = null
  ) => {
    const currentGraph = graphRef.current;
    if (!currentGraph) return;

    currentGraph.clearCells(); // Clear previous data before loading new
    const nodeMap = new Map();

    tasks.forEach((task) => {
      const taskEditor = taskTypes.find((t: any) => t.type === task.task_type);

      if (!taskEditor) {
        throw new Error(`未找到任务类型 "${task.task_type}" 的编辑器配置。`);
      }

      (taskEditor as any).createNode(currentGraph, { ...task, label: task.name }, { px: 0, py: 0 });
      const newNode = currentGraph.getNodes().find(n => n.getData().name === task.name);
      if (newNode) {
        newNode.setData(task);
        nodeMap.set(task.name, newNode);
      }
    });

    tasks.forEach(task => {
      // Edges from deps
      if (task.deps && task.deps.length > 0) {
        const uniqueDeps = Array.from(new Set(task.deps));
        uniqueDeps.forEach((dep: string) => {
          const sourceNode = nodeMap.get(dep);
          const targetNode = nodeMap.get(task.name);

          if (sourceNode && targetNode) {
            const sourceTask = sourceNode.getData();
            const edge: any = {
              shape: 'edge',
              source: { cell: sourceNode.id, port: 'out' },
              target: { cell: targetNode.id, port: 'in' },
              attrs: { line: { stroke: '#8f8f8f', strokeWidth: 1 } },
              zIndex: -1,
              router: { name: 'manhattan' },
              connector: { name: 'rounded' },
            };

            if (sourceTask.task_type === 'CONDITIONS' || sourceTask.type === 'CONDITIONS') {
              const { dependence } = sourceTask.task_params as any;
              let isConditionEdge = false;
              if (dependence && dependence.dependTaskList && dependence.dependTaskList.length > 0 && dependence.dependTaskList[0].conditionResult) {
                const { successNode, failedNode } = dependence.dependTaskList[0].conditionResult;
                if (successNode && successNode.includes(task.name)) {
                  edge.source.port = 'out-success';
                  edge.attrs.line.stroke = '#28a745';
                  edge.attrs.line.strokeWidth = 2;
                  isConditionEdge = true;
                } else if (failedNode && failedNode.includes(task.name)) {
                  edge.source.port = 'out-failure';
                  edge.attrs.line.stroke = '#dc3545';
                  edge.attrs.line.strokeWidth = 2;
                  isConditionEdge = true;
                }
              }
              if (isConditionEdge) {
                currentGraph.addEdge(edge);
              }
            } else {
              currentGraph.addEdge(edge);
            }
          }
        });
      }

      // Edges from Switch conditions
      if ((task.task_type === 'Switch' || task.type === 'Switch') && Array.isArray(task.condition)) {
        task.condition.forEach((cond: any) => {
          const sourceNode = nodeMap.get(task.name);
          const targetNode = nodeMap.get(cond.task);
          if (sourceNode && targetNode) {
            currentGraph.addEdge({
              shape: 'edge',
              source: { cell: sourceNode.id, port: 'out' },
              target: { cell: targetNode.id, port: 'in' },
              attrs: { line: { stroke: '#8f8f8f', strokeWidth: 1 } },
              zIndex: -1,
              router: { name: 'manhattan' },
              connector: { name: 'rounded' },
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
