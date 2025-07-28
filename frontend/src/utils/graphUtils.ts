import { Graph, Node, Edge } from '@antv/x6';
import { Task } from '../types';
import { taskTypes } from '../config/taskTypes';

export const createDefaultNode = (graph: Graph, taskInfo: any, contextMenu: { px: number, py: number }) => {
  const taskEditor = taskTypes.find((t: any) => t.type === taskInfo.type);

  if (!taskEditor) {
    throw new Error(`未找到任务类型 "${taskInfo.type}" 的编辑器配置。`);
  }

  (taskEditor as any).createNode(graph, taskInfo, contextMenu);
};

/**
 * Compiles the graph data before submitting to the backend.
 * This function merges DEPENDENT, AND, and OR nodes into a single DEPENDENT node
 * that the backend can understand.
 * @param graph The X6 graph instance.
 * @returns An object containing the compiled tasks and edges.
 */
export const compileGraph = (graph: Graph) => {
  let currentNodes = graph.getNodes();
  let currentEdges = graph.getEdges();

  while (true) {
    const logicNodes = currentNodes.filter(n => ['AND', 'OR'].includes(n.getData().type));
    if (logicNodes.length === 0) {
      break; // No more logic nodes to process
    }

    let processedInThisIteration = false;

    for (const logicNode of logicNodes) {
      const incomingEdges = currentEdges.filter(edge => edge.getTargetCellId() === logicNode.id);
      const upstreamNodes = incomingEdges.map(edge => currentNodes.find(n => n.id === edge.getSourceCellId())).filter(Boolean) as Node[];

      // A logic node is ready to be compiled if all its direct upstream nodes are DEPENDENT nodes
      const isReadyToCompile = upstreamNodes.every(n => n.getData().type === 'DEPENDENT');

      if (!isReadyToCompile || upstreamNodes.length === 0) {
        continue; // Skip this node for now, will process in a later iteration
      }

      processedInThisIteration = true;

      // 1. Create a new, single DEPENDENT node that represents the entire logic group
      const logicGateParams = logicNode.getData().task_params;
      const logicRelation = logicNode.getData().type; // The relation of the current logic gate

      // Separate upstream nodes into simple dependencies and already compiled groups
      const simpleUpstreamNodes = upstreamNodes.filter(n => !n.getData().task_params.denpendence.dependTaskList);
      const complexUpstreamNodes = upstreamNodes.filter(n => !!n.getData().task_params.denpendence.dependTaskList);

      // Start building the new dependTaskList
      let newDependTaskList: any[] = [];

      // Create a new group for all simple dependencies, using the current logic gate's relation
      if (simpleUpstreamNodes.length > 0) {
        const simpleDependItems = simpleUpstreamNodes.map(n => {
          const dep = n.getData().task_params.denpendence;
          return {
            dependentType: 'DEPENDENT_ON_WORKFLOW',
            projectCode: dep.project,
            definitionCode: dep.workflow,
            depTaskCode: 0,
            cycle: dep.date_unit,
            dateValue: dep.date_value,
            parameterPassing: !!dep.pass_params,
          };
        });
        newDependTaskList.push({
          relation: logicRelation,
          dependItemList: simpleDependItems,
        });
      }

      // Add the task lists from the already compiled groups
      const complexDependTaskLists = complexUpstreamNodes.flatMap(n => n.getData().task_params.denpendence.dependTaskList);
      newDependTaskList = newDependTaskList.concat(complexDependTaskLists);

      const newNodeData: Partial<Task> = {
        name: `dependent_group_${logicNode.id}`,
        label: `依赖组 (${logicRelation})`,
        task_type: 'DEPENDENT',
        type: 'DEPENDENT',
        task_params: {
          denpendence: {
            relation: logicRelation,
            dependTaskList: newDependTaskList,
            failurePolicy: logicGateParams.failure_strategy === 'fail' ? 'DEPENDENT_FAILURE_FAILURE' : 'DEPENDENT_FAILURE_WAITING',
            failureWaitingTime: logicGateParams.failure_waiting_time || 30,
            checkInterval: logicGateParams.check_interval || 10,
          },
        },
        _display_type: 'DEPENDENT',
      };

      const { x, y } = logicNode.getPosition();
      const compiledDependentNode = graph.createNode({
        id: `compiled_${logicNode.id}`,
        shape: 'task-node',
        x,
        y,
        data: newNodeData as Task,
      });

      // 2. Rewire the graph
      const downstreamEdges = currentEdges.filter(edge => edge.getSourceCellId() === logicNode.id);
      for (const edge of downstreamEdges) {
        edge.setSource(compiledDependentNode);
      }

      // 3. Remove all the nodes and edges that have been merged
      const nodesToRemove = new Set([...upstreamNodes.map(n => n.id), logicNode.id]);
      currentNodes = currentNodes.filter(n => !nodesToRemove.has(n.id));
      currentNodes.push(compiledDependentNode);

      currentEdges = currentEdges.filter(edge =>
        !nodesToRemove.has(edge.getSourceCellId()) &&
        !nodesToRemove.has(edge.getTargetCellId())
      );
    }

    if (!processedInThisIteration) {
      // If we went through a whole loop without processing anything, there might be a cycle or an invalid structure.
      // We break to avoid an infinite loop.
      console.error("Could not compile the graph. Please check for cycles or invalid dependency structures.");
      break;
    }
  }

  // Final cleanup
  const tasks = currentNodes.map(node => node.getData());
  const taskRelations = currentEdges.map(edge => {
    const sourceNode = currentNodes.find(n => n.id === edge.getSourceCellId());
    const targetNode = currentNodes.find(n => n.id === edge.getTargetCellId());
    return {
      source_task: sourceNode?.getData().name,
      target_task: targetNode?.getData().name,
    };
  }).filter(r => r.source_task && r.target_task);

  return { tasks, taskRelations };
};
