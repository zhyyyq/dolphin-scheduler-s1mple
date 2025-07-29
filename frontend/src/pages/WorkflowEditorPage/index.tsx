import React, { useEffect, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import './index.less';
import { useNavigate, useParams } from 'react-router-dom';
import { App as AntApp } from 'antd';
import yaml from 'yaml';
import dayjs from 'dayjs';
import '../../components/TaskNode'; // Register custom node
import api from '../../api';
import EditorDagGraph from './components/EditorDagGraph';
import { WorkflowToolbar } from './components/WorkflowToolbar';
import EditTaskModal from './components/EditTaskModal';
import EditParamNodeModal from './components/EditParamNodeModal';
import EditEdgeLabelModal from './components/EditEdgeLabelModal';
import { ViewYamlModal } from './components/ViewYamlModal';
import { WorkflowContextMenu } from './components/WorkflowContextMenu';
import { RootState, AppDispatch } from '../../store';
import {
  setContextMenu,
  setCurrentEdge,
  setWorkflowName,
  setWorkflowSchedule,
  setIsScheduleEnabled,
  setScheduleTimeRange,
  setWorkflowUuid,
  setGraph,
  saveWorkflow,
  showYaml,
  fetchDiyFunctions,
  fetchWorkflow,
  handleNodeDoubleClick as handleNodeDoubleClickThunk,
  importYaml,
} from '../../store/slices/workflowEditorSlice';

const WorkflowEditorPage: React.FC = () => {
  const {
    contextMenu,
    workflowData,
  } = useSelector((state: RootState) => state.workflowEditor);
  const dispatch: AppDispatch = useDispatch();
  const navigate = useNavigate();
  const { workflow_uuid } = useParams<{ workflow_uuid: string }>();
  const { message } = AntApp.useApp();

  const handleBlankContextMenu = useCallback((e: any, x: number, y: number) => {
    e.preventDefault();
    dispatch(setContextMenu({ visible: true, x: e.clientX, y: e.clientY, px: x, py: y }));
  }, [dispatch]);

  const handleEdgeDoubleClick = useCallback((edge: any) => {
    const sourceNode = edge.getSourceNode();
    if (sourceNode && sourceNode.getData().type === 'SWITCH') {
      dispatch(setCurrentEdge(edge));
    }
  }, [dispatch]);

  const { graph } = useSelector((state: RootState) => state.workflowEditor);
  const setGraphInstance = (g: any) => dispatch(setGraph(g));
  const [loadGraphData, setLoadGraphData] = useState<any>(null);
  const [autoLayout, setAutoLayout] = useState<any>(null);

  const handleNodeDoubleClick = useCallback((args: { node: any }) => {
    dispatch(handleNodeDoubleClickThunk(args));
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchDiyFunctions()).unwrap().catch(() => message.error('加载自定义组件失败'));

    if (workflow_uuid) {
      dispatch(fetchWorkflow(workflow_uuid)).unwrap().catch(() => message.error('加载工作流数据失败。'));
    }
  }, [workflow_uuid, message, dispatch]);

  // Effect for workflow metadata
  useEffect(() => {
    if (!workflowData) return;

    const { name, uuid, yaml_content } = workflowData;
    dispatch(setWorkflowName(name));
    dispatch(setWorkflowUuid(uuid));

    try {
      const doc = yaml.parseDocument(yaml_content);
      const schedule = doc.getIn(['workflow', 'schedule']);
      const startTime = doc.getIn(['workflow', 'startTime']);
      const endTime = doc.getIn(['workflow', 'endTime']);

      if (schedule !== undefined && schedule !== null) {
        let scheduleStr = String(schedule).replace(/\?/g, '*');
        const parts = scheduleStr.split(' ');
        if (parts.length === 6 || parts.length === 7) {
          scheduleStr = `${parts[1]} ${parts[2]} ${parts[3]} ${parts[4]} ${parts[5]}`;
        }
        dispatch(setWorkflowSchedule(scheduleStr));
        dispatch(setIsScheduleEnabled(true));
        if (startTime && endTime) {
          dispatch(setScheduleTimeRange([dayjs(String(startTime)).toISOString(), dayjs(String(endTime)).toISOString()]));
        }
      } else {
        dispatch(setIsScheduleEnabled(false));
      }
    } catch (error) {
      message.error(`解析工作流元数据失败: ${(error as Error).message}`);
    }
  }, [workflowData?.name, workflowData?.uuid, workflowData?.yaml_content]);

  // Effect for graph content
  useEffect(() => {
    const loadGraphContent = async () => {
      if (!graph || !workflowData) return;

      const { yaml_content } = workflowData;
      try {
        const doc = yaml.parseDocument(yaml_content);
        const tasks = (doc.get('tasks') as any)?.toJSON() || [];
        
        // Pre-process DIY_FUNCTION tasks to enrich them with full data
        const diyFunctionPromises = tasks
          .filter((task: any) => task.type === 'DIY_FUNCTION')
          .map(async (task: any) => {
            const functionId = task.task_params?.functionId;
            if (functionId) {
              try {
                const funcData = await api.get<any>(`/api/diy-functions/${functionId}`);
                if (funcData) {
                  task.label = funcData.functionName;
                  task.command = funcData.functionContent;
                  if (!task.task_params) task.task_params = {};
                  task.task_params.contentHash = funcData.contentHash;
                } else {
                  throw new Error('API returned empty data');
                }
              } catch (e) {
                console.error(`Failed to fetch DIY function ${functionId}`, e);
                task.label = `Error: Func ${functionId} not found`;
                task.name = `Error: Func ${functionId} not found`;
              }
            }
          });

        await Promise.all(diyFunctionPromises);

        const parameters = (doc.get('parameters') as any)?.toJSON() || [];
        const globalParamNodes = parameters.map((p: any) => ({
          name: p.name,
          label: p.name,
          type: 'PARAMS',
          task_type: 'PARAMS',
          task_params: { prop: p.name, type: p.type, value: p.value, direction: p.direction },
        }));

        const localParamNodes: any[] = [];
        tasks.forEach((task: any) => {
          const params = task.localParams || task.task_params?.localParams;
          if (params) {
            params.forEach((p: any) => {
              if (!globalParamNodes.some((gp: any) => gp.name === p.prop) && !localParamNodes.some((lp: any) => lp.name === p.prop)) {
                localParamNodes.push({
                  name: p.prop,
                  label: p.prop,
                  type: 'PARAMS',
                  task_type: 'PARAMS',
                  task_params: { prop: p.prop, type: p.type, value: p.value, direction: p.direction },
                });
              }
            });
          }
        });

        const allNodes = [...tasks, ...globalParamNodes, ...localParamNodes];
        const locations = workflowData.locations ? JSON.parse(workflowData.locations) : null;
        const relations: { from: string, to: string, sourcePort?: string, targetPort?: string, label?: string }[] = [];
        const conditionTasks = new Set(tasks.filter((t: any) => t.type === 'CONDITIONS').map((t: any) => t.name));

        for (const task of tasks) {
          if (task.deps) {
            for (const dep of task.deps) {
              if (!conditionTasks.has(dep)) {
                relations.push({ from: dep, to: task.name });
              }
            }
          }
          if (task.type === 'SWITCH' && task.task_params?.switchResult) {
            const { dependTaskList, nextNode } = task.task_params.switchResult;
            if (dependTaskList) {
              for (const item of dependTaskList) {
                if (item.nextNode) relations.push({ from: task.name, to: item.nextNode, label: item.condition });
              }
            }
            if (nextNode) relations.push({ from: task.name, to: nextNode, label: '' });
          }
          if (task.type === 'CONDITIONS' && task.task_params?.dependence?.dependTaskList?.[0]?.conditionResult) {
            const { successNode, failedNode } = task.task_params.dependence.dependTaskList[0].conditionResult;
            if (successNode) {
              for (const nodeName of successNode) relations.push({ from: task.name, to: nodeName, sourcePort: 'out-success', targetPort: 'in' });
            }
            if (failedNode) {
              for (const nodeName of failedNode) relations.push({ from: task.name, to: nodeName, sourcePort: 'out-failure', targetPort: 'in' });
            }
          }
          const params = task.localParams || task.task_params?.localParams;
          if (params) {
            for (const param of params) {
              if (param.direct === 'IN') relations.push({ from: param.prop, to: task.name });
              else relations.push({ from: task.name, to: param.prop });
            }
          }
        }
        loadGraphData(allNodes, relations, locations);
      } catch (error) {
        message.error(`解析工作流 YAML 失败: ${(error as Error).message}`);
      }
    };

    loadGraphContent();
  }, [graph, workflowData?.yaml_content, loadGraphData]);


  const handleShowYaml = useCallback(() => {
    dispatch(showYaml());
  }, [dispatch]);

  const handleSave = useCallback(async () => {
    try {
      await dispatch(saveWorkflow()).unwrap();
      message.success('工作流保存成功！');
      navigate('/');
    } catch (error: any) {
      message.error(`保存工作流时出错: ${error.message}`);
    }
  }, [dispatch, navigate, message]);

  const handleImportYaml = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const result = await dispatch(importYaml(file)).unwrap();
        if (graph && loadGraphData) {
          graph.clearCells();
          loadGraphData(result.tasks, result.relations);
        }
        message.success('YAML 导入成功！');
      } catch (err) {
        message.error('解析或加载导入的 YAML 文件失败。');
      }
    }
    // Reset file input to allow importing the same file again
    event.target.value = '';
  }, [dispatch, graph, loadGraphData, message]);

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)' }}>
      <div style={{ flex: 1, position: 'relative' }} onClick={() => dispatch(setContextMenu({ ...contextMenu, visible: false }))}>
        <WorkflowToolbar
          onShowYaml={handleShowYaml}
          onSave={handleSave}
          onAutoLayout={autoLayout}
          onImportYaml={handleImportYaml}
        />
        <EditorDagGraph
          onBlankContextMenu={handleBlankContextMenu}
          onEdgeDoubleClick={handleEdgeDoubleClick}
          onNodeDoubleClick={handleNodeDoubleClick}
          setGraphInstance={setGraphInstance}
          setLoadGraphData={setLoadGraphData}
          setAutoLayout={setAutoLayout}
        />
        <EditTaskModal />
        <EditParamNodeModal />
        <EditEdgeLabelModal />
        <ViewYamlModal />
        <WorkflowContextMenu />
      </div>
    </div>
  );
};

export default WorkflowEditorPage;
