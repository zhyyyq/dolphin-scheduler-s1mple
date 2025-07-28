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

    let copiedNodeData: any = null;
    let copiedNodePosition: { x: number, y: number } | null = null;

    graphInstance.bindKey('ctrl+c', () => {
      const selectedNodes = graphInstance.getSelectedCells().filter(cell => cell.isNode());
      if (selectedNodes.length > 0) {
        const node = selectedNodes[0];
        copiedNodeData = JSON.parse(JSON.stringify(node.getData()));
        copiedNodePosition = node.position();
      }
    });

    graphInstance.bindKey('ctrl+v', () => {
      if (copiedNodeData && copiedNodePosition) {
        const newNodeData = { ...copiedNodeData };
        
        const allNodes = graphInstance.getNodes();
        let newName = newNodeData.label;
        let counter = 1;
        while (allNodes.some(n => n.getData().label === newName)) {
          const match = newName.match(/^(.*)_(\d+)$/);
          if (match) {
            newName = `${match[1]}_${parseInt(match[2], 10) + 1}`;
          } else {
            newName = `${newNodeData.label}_${counter}`;
          }
          counter++;
        }
        newNodeData.name = newName;
        newNodeData.label = newName;

        graphInstance.addNode({
          shape: 'task-node',
          x: copiedNodePosition.x + 40,
          y: copiedNodePosition.y + 40,
          data: newNodeData,
        });
      }
    });

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
    nodes: (Task & { label?: string })[],
    relations: { from: string; to: string; sourcePort?: string; targetPort?: string }[] = [],
    locations: { taskCode: string, x: number, y: number }[] | null = null
  ) => {
    const currentGraph = graphRef.current;
    if (!currentGraph) return;

    currentGraph.clearCells();
    const nodeMap = new Map();

    // Create all nodes
    nodes.forEach((nodeData) => {
      const taskEditor = taskTypes.find((t) => t.type === nodeData.task_type);
      if (!taskEditor) {
        console.error(`未找到任务类型 "${nodeData.task_type}" 的编辑器配置。`);
        return;
      }

      const position = locations?.find(l => l.taskCode === nodeData.name) || { x: 0, y: 0 };
      
      // createNode should return the created node or handle its creation internally
      const createdNode = (taskEditor as any).createNode(currentGraph, { ...nodeData, label: nodeData.name }, { px: position.x, py: position.y });
      
      // If createNode doesn't return the node, we need to find it.
      // This assumes names are unique for now.
      const newNode = currentGraph.getNodes().find(n => n.getData().name === nodeData.name && !nodeMap.has(nodeData.name));

      if (newNode) {
        newNode.setData(nodeData);
        if (locations) {
          newNode.position(position.x, position.y);
        }
        nodeMap.set(nodeData.name, newNode);
      }
    });

    // Create all edges based on relations
    relations.forEach(({ from, to, sourcePort: relSourcePort, targetPort: relTargetPort }) => {
      const sourceNode = nodeMap.get(from);
      const targetNode = nodeMap.get(to);

      if (sourceNode && targetNode) {
        const sourceData = sourceNode.getData();
        const targetData = targetNode.getData();

        let sourcePort = relSourcePort || 'out';
        let targetPort = relTargetPort || 'in';

        if (sourceData.type === 'PARAMS') {
          sourcePort = 'out';
        }
        if (targetData.type === 'PARAMS') {
          targetPort = 'in';
        }

        currentGraph.addEdge({
          shape: 'edge',
          source: { cell: sourceNode.id, port: sourcePort },
          target: { cell: targetNode.id, port: targetPort },
          attrs: { line: { stroke: '#8f8f8f', strokeWidth: 1 } },
          zIndex: -1,
          router: { name: 'manhattan' },
          connector: { name: 'rounded' },
        });
      }
    });

    const graphNodes = currentGraph.getNodes();
    const graphEdges = currentGraph.getEdges();
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: 'TB', nodesep: 40, ranksep: 80 });
    g.setDefaultEdgeLabel(() => ({}));

    const width = 180;
    const height = 36;
    graphNodes.forEach((node) => {
      if (node.id) {
        g.setNode(node.id, { width, height });
      }
    });

    graphEdges.forEach((edge) => {
      const source = edge.getSource();
      const target = edge.getTarget();
      if (source && 'cell' in source && target && 'cell' in target) {
        const sourceId = source.cell;
        const targetId = target.cell;
        if (typeof sourceId === 'string' && typeof targetId === 'string') {
          g.setEdge(sourceId, targetId);
        }
      }
    });

    dagre.layout(g);

    g.nodes().forEach((id: string) => {
      const node = currentGraph.getCellById(id);
      if (node && node.isNode()) {
        const pos = g.node(id);
        node.position(pos.x, pos.y);
      }
    });

    currentGraph.centerContent();
  }, []);

  const autoLayout = useCallback(() => {
    const currentGraph = graphRef.current;
    if (!currentGraph) return;

    const graphNodes = currentGraph.getNodes();
    const graphEdges = currentGraph.getEdges();
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: 'TB', nodesep: 40, ranksep: 80 });
    g.setDefaultEdgeLabel(() => ({}));

    const width = 180;
    const height = 36;
    graphNodes.forEach((node) => {
      if (node.id) {
        g.setNode(node.id, { width, height });
      }
    });

    graphEdges.forEach((edge) => {
      const source = edge.getSource();
      const target = edge.getTarget();
      if (source && 'cell' in source && target && 'cell' in target) {
        const sourceId = source.cell;
        const targetId = target.cell;
        if (typeof sourceId === 'string' && typeof targetId === 'string') {
          g.setEdge(sourceId, targetId);
        }
      }
    });

    dagre.layout(g);

    g.nodes().forEach((id: string) => {
      const node = currentGraph.getCellById(id);
      if (node && node.isNode()) {
        const pos = g.node(id);
        node.position(pos.x, pos.y);
      }
    });

    currentGraph.centerContent();
  }, []);

  return { graph, loadGraphData, autoLayout };
};
