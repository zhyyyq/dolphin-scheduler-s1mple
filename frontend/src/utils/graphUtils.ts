import { Graph } from '@antv/x6';
import { Task } from '../types';
import { taskTypes } from '../config/taskTypes';

export const createDefaultNode = (graph: Graph, taskInfo: any, contextMenu: { px: number, py: number }) => {
  const taskEditor = taskTypes.find((t: any) => t.type === taskInfo.type);

  if (!taskEditor) {
    throw new Error(`未找到任务类型 "${taskInfo.type}" 的编辑器配置。`);
  }

  (taskEditor as any).createNode(graph, taskInfo, contextMenu);
};
