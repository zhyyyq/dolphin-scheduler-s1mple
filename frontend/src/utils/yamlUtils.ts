import { Graph } from '@antv/x6';
import yaml from 'yaml';

export const generateYamlStr = (
  graph: Graph,
  workflowName: string,
  isScheduleEnabled: boolean,
  workflowSchedule: string,
  originalYaml?: string
): string => {
  const nodes = graph.getNodes();
  const edges = graph.getEdges();

  if (nodes.length === 0) {
    return '';
  }

  const doc = yaml.parseDocument(originalYaml || 'workflow:\n  name: new-workflow\ntasks: []\nparameters: []');

  doc.setIn(['workflow', 'name'], workflowName);
  if (isScheduleEnabled) {
    doc.setIn(['workflow', 'schedule'], workflowSchedule);
  } else {
    doc.deleteIn(['workflow', 'schedule']);
  }

  const tasks = nodes
    .filter(node => node.getData().type !== 'PARAMS')
    .map(node => {
      const data = node.getData();
      const { _display_type, id, label, ...restOfTask } = data;
      const deps = edges
        .filter(edge => edge.getTargetCellId() === node.id)
        .map(edge => {
          const sourceNode = edge.getSourceCell();
          return sourceNode?.getData().name;
        })
        .filter(Boolean);

      const taskPayload: any = { ...restOfTask };

      if (deps.length > 0) {
        taskPayload.deps = Array.from(new Set(deps));
      }
      
      if (taskPayload.task_params && Object.keys(taskPayload.task_params).length === 0) {
        delete taskPayload.task_params;
      }

      return taskPayload;
    });

  const parameters = nodes
    .filter(node => node.getData().type === 'PARAMS')
    .map(node => {
      const data = node.getData().task_params;
      return {
        name: data.prop,
        type: data.type,
        value: data.value,
      };
    });

  doc.set('tasks', tasks);
  doc.set('parameters', parameters);

  return doc.toString();
};
