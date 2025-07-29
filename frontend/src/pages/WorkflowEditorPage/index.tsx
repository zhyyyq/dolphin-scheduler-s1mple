import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import './index.less';
import { useNavigate, useParams } from 'react-router-dom';
import { App as AntApp } from 'antd';
import yaml from 'yaml';
import dayjs from 'dayjs';
import '../../components/TaskNode'; // Register custom node
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
  loadGraphContent,
} from '../../store/slices/workflowEditorSlice';

const WorkflowEditorPage: React.FC = () => {
  const dispatch: AppDispatch = useDispatch();
  const navigate = useNavigate();
  const {
    contextMenu,
    workflowData,
  } = useSelector((state: RootState) => state.workflowEditor);
  const { workflow_uuid } = useParams<{ workflow_uuid: string }>();
  const { message } = AntApp.useApp();

  const { graph } = useSelector((state: RootState) => state.workflowEditor);

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
    if (graph && workflowData) {
      dispatch(loadGraphContent());
    }
  }, [graph, workflowData, dispatch]);


  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)' }}>
      <div style={{ flex: 1, position: 'relative' }} onClick={() => dispatch(setContextMenu({ ...contextMenu, visible: false }))}>
        <WorkflowToolbar />
        <EditorDagGraph />
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
