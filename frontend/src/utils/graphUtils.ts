import { Graph } from '@antv/x6';
import { Task } from '../types';

export const createDefaultNode = (graph: Graph, taskInfo: any, contextMenu: { px: number, py: number }) => {
  const existingNodes = graph.getNodes();
  let newNodeName = taskInfo.label;
  let counter = 1;
  while (existingNodes.some(n => n.getData().label === newNodeName)) {
    newNodeName = `${taskInfo.label}_${counter}`;
    counter++;
  }

  const nodeData: Partial<Task> = {
    name: newNodeName,
    label: newNodeName,
    task_type: taskInfo.type,
    type: taskInfo.type,
    task_params: (taskInfo as any).default_params || {},
    _display_type: taskInfo.type,
  };

  if (['SHELL', 'PYTHON', 'HTTP'].includes(taskInfo.type)) {
    nodeData.command = taskInfo.command;
  }

  graph.addNode({
    shape: 'task-node',
    x: contextMenu.px,
    y: contextMenu.py,
    data: nodeData as Task,
  });
};
