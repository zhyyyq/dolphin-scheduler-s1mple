import yaml from 'yaml';
import { Graph } from '@antv/x6';

export const generateYamlStr = (
  graph: Graph,
  workflowName: string,
  isScheduleEnabled: boolean,
  workflowSchedule: string,
  originalYaml?: string
): string => {
  const doc = yaml.parseDocument(originalYaml || 'workflow:\n  name: new-workflow\ntasks: []\nparameters: []');

  doc.setIn(['workflow', 'name'], workflowName);
  if (isScheduleEnabled) {
    doc.setIn(['workflow', 'schedule'], workflowSchedule);
  } else {
    doc.deleteIn(['workflow', 'schedule']);
  }

  const { cells } = graph.toJSON();
  const allGraphNodes = cells.filter(cell => cell.shape === 'task-node');
  const edges = cells.filter(cell => cell.shape === 'edge');
  const nodeMap = new Map(allGraphNodes.map(n => [n.id, n.data]));

  const connectedParamIds = new Set();
  edges.forEach(edge => {
    const sourceNode = nodeMap.get(edge.source.cell);
    const targetNode = nodeMap.get(edge.target.cell);
    if (sourceNode?.type === 'PARAMS') connectedParamIds.add(edge.source.cell);
    if (targetNode?.type === 'PARAMS') connectedParamIds.add(edge.target.cell);
  });

  const tasks = [];
  const globalParameters = [];

  for (const node of allGraphNodes) {
    const nodeData = node.data;

    if (nodeData.type === 'PARAMS') {
      if (!connectedParamIds.has(node.id)) {
        globalParameters.push({
          name: nodeData.name,
          type: nodeData.task_params?.type || 'VARCHAR',
          value: nodeData.task_params?.value || '',
        });
      }
      continue;
    }

    const deps: string[] = [];
    const localParams: any[] = [];

    const incomingEdges = edges.filter(edge => edge.target.cell === node.id);
    for (const edge of incomingEdges) {
      const sourceNodeData = nodeMap.get(edge.source.cell);
      if (sourceNodeData) {
        if (sourceNodeData.type === 'PARAMS') {
          localParams.push({
            prop: sourceNodeData.name,
            direct: 'IN',
            type: sourceNodeData.task_params?.type || 'VARCHAR',
            value: sourceNodeData.task_params?.value || '',
          });
        } else {
          deps.push(sourceNodeData.name);
        }
      }
    }

    const outgoingEdges = edges.filter(edge => edge.source.cell === node.id);
    for (const edge of outgoingEdges) {
      const targetNodeData = nodeMap.get(edge.target.cell);
      if (targetNodeData && targetNodeData.type === 'PARAMS') {
        localParams.push({
          prop: targetNodeData.name,
          direct: 'OUT',
          type: targetNodeData.task_params?.type || 'VARCHAR',
          value: targetNodeData.task_params?.value || '',
        });
      }
    }

    const taskPayload: any = {
      name: nodeData.name,
      task_type: nodeData.task_type,
      type: nodeData.type,
      task_params: { ...(nodeData.task_params || {}) },
    };

    if (nodeData.command !== undefined) {
      taskPayload.command = nodeData.command;
    }
    
    delete taskPayload.task_params.localParams;
    
    if (localParams.length > 0) {
      taskPayload.localParams = localParams;
    }
    
    if (deps.length > 0) {
      taskPayload.deps = deps;
    }

    if (Object.keys(taskPayload.task_params).length === 0) {
      delete taskPayload.task_params;
    }

    tasks.push(taskPayload);
  }

  doc.set('tasks', tasks);
  if (globalParameters.length > 0) {
    doc.set('parameters', globalParameters);
  } else {
    doc.delete('parameters');
  }

  return doc.toString();
};
