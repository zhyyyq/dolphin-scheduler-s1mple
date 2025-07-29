import yaml from 'yaml';
import { Graph } from '@antv/x6';
import dayjs from 'dayjs';

export const generateYamlStr = (
  graph: Graph,
  workflowName: string,
  isScheduleEnabled: boolean,
  workflowSchedule: string,
  scheduleTimeRange: [dayjs.Dayjs | null, dayjs.Dayjs | null],
  originalYaml?: string
): string => {
  const doc = yaml.parseDocument(originalYaml || 'workflow:\n  name: new-workflow\ntasks: []\nparameters: []');

  doc.setIn(['workflow', 'name'], workflowName);
  if (isScheduleEnabled) {
    doc.setIn(['workflow', 'schedule'], workflowSchedule);
    if (scheduleTimeRange[0] && scheduleTimeRange[1]) {
      doc.setIn(['workflow', 'startTime'], scheduleTimeRange[0].format('YYYY-MM-DD HH:mm:ss'));
      doc.setIn(['workflow', 'endTime'], scheduleTimeRange[1].format('YYYY-MM-DD HH:mm:ss'));
    } else {
      doc.deleteIn(['workflow', 'startTime']);
      doc.deleteIn(['workflow', 'endTime']);
    }
  } else {
    doc.deleteIn(['workflow', 'schedule']);
    doc.deleteIn(['workflow', 'startTime']);
    doc.deleteIn(['workflow', 'endTime']);
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
          direction: nodeData.task_params?.direction || 'IN',
        });
      }
      continue;
    }

    const deps: string[] = [];
    const localParams: any[] = [];

    // Get all non-parameter dependencies by iterating incoming edges
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
        } else if (sourceNodeData.type !== 'CONDITIONS' && sourceNodeData.type !== 'SWITCH') {
          deps.push(sourceNodeData.name);
        }
      }
    }
    const uniqueDeps = Array.from(new Set(deps));

    // Get all outgoing parameter connections
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
    };

    // Selectively add properties from nodeData if they exist
    if (nodeData.failRetryTimes !== undefined) {
      taskPayload.failRetryTimes = nodeData.failRetryTimes;
    }
    if (nodeData.failRetryInterval !== undefined) {
      taskPayload.failRetryInterval = nodeData.failRetryInterval;
    }
    if (nodeData.command !== undefined) {
      taskPayload.command = nodeData.command;
    }

    const { localParams: oldLocalParams, switchResult: oldSwitchResult, ...restTaskParams } = nodeData.task_params || {};
    taskPayload.task_params = { ...restTaskParams };

    if (oldSwitchResult) {
      taskPayload.task_params.switchResult = oldSwitchResult;
    }

    if (oldLocalParams) {
      taskPayload.task_params.localParams = oldLocalParams;
    }

    // For CONDITIONS nodes, add the special 'dependence' block
    if (nodeData.type === 'CONDITIONS') {
      const successNode: string[] = [];
      const failedNode: string[] = [];
      const conditionOutgoingEdges = edges.filter(edge => edge.source.cell === node.id);

      for (const edge of conditionOutgoingEdges) {
        const targetNode = allGraphNodes.find(n => n.id === edge.target.cell);
        if (targetNode && targetNode.data.type !== 'PARAMS') {
          if (edge.source.port === 'out-success') {
            successNode.push(targetNode.data.name);
          } else if (edge.source.port === 'out-failure') {
            failedNode.push(targetNode.data.name);
          }
        }
      }
      
      if (successNode.length > 0 || failedNode.length > 0) {
        if (!taskPayload.task_params) {
          taskPayload.task_params = {};
        }
        taskPayload.task_params.dependence = {
          relation: 'AND',
          dependTaskList: [
            {
              relation: 'AND',
              dependTaskList: [],
              conditionResult: {
                successNode: successNode,
                failedNode: failedNode
              }
            }
          ]
        };
      }
    } else if (nodeData.type === 'SWITCH') {
      const dependTaskList: { condition: string, nextNode: string }[] = [];
      const switchOutgoingEdges = edges.filter(edge => edge.source.cell === node.id);
      let defaultBranchNode = '';

      for (const edge of switchOutgoingEdges) {
        const targetNode = allGraphNodes.find(n => n.id === edge.target.cell);
        if (targetNode && targetNode.data.type !== 'PARAMS') {
          const condition = edge.labels?.[0]?.attrs?.label?.text || '';
          if (condition) {
            dependTaskList.push({
              condition: condition,
              nextNode: targetNode.data.name,
            });
          } else {
            defaultBranchNode = targetNode.data.name;
          }
        }
      }

      if (dependTaskList.length > 0 || defaultBranchNode) {
        if (!taskPayload.task_params) {
          taskPayload.task_params = {};
        }
        taskPayload.task_params.switchResult = {
          dependTaskList: dependTaskList,
          nextNode: defaultBranchNode,
        };
      } else if (taskPayload.task_params.switchResult) {
        // Keep existing switchResult if no new edges are found
        // This can happen if the graph is not fully connected yet
      }
    }

    if (taskPayload.command !== undefined && taskPayload.type === 'SUB_PROCESS') {
      delete taskPayload.command;
    }
    
    // For script-based tasks, ensure command is in task_params.rawScript
    if (['SHELL', 'PYTHON'].includes(taskPayload.type)) {
      if (taskPayload.command) {
        taskPayload.task_params.rawScript = taskPayload.command;
        delete taskPayload.command;
      }
    }
    
    if (localParams.length > 0) {
      if (!taskPayload.task_params) {
        taskPayload.task_params = {};
      }
      taskPayload.task_params.localParams = localParams;
    }
    
    // Add the deps array to the payload if it's not empty
    if (uniqueDeps.length > 0) {
      taskPayload.deps = uniqueDeps;
    }

    // Ensure retry times and interval are strings
    if (taskPayload.failRetryTimes !== undefined) {
      taskPayload.failRetryTimes = String(taskPayload.failRetryTimes);
    }
    if (taskPayload.failRetryInterval !== undefined) {
      taskPayload.failRetryInterval = String(taskPayload.failRetryInterval);
    }

    // For DIY_FUNCTION, never persist the command field to YAML.
    // It should always be fetched dynamically via functionId.
    if (taskPayload.type === 'DIY_FUNCTION') {
      delete taskPayload.command;
      // But do persist the contentHash for version checking.
      if (nodeData.task_params?.contentHash) {
        if (!taskPayload.task_params) {
          taskPayload.task_params = {};
        }
        taskPayload.task_params.contentHash = nodeData.task_params.contentHash;
      }
    }

    // Clean up empty task_params only if it's truly empty
    if (taskPayload.task_params && Object.keys(taskPayload.task_params).length === 0) {
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
