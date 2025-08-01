import React, { useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import './index.less';
import { useParams, useLocation } from 'react-router-dom';
import { App as AntApp } from 'antd';
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
  fetchDiyFunctions,
  fetchWorkflow,
  setWorkflowData,
  clearWorkflow,
  importYaml,
  initializeGraph,
} from '../../store/slices/workflowEditorSlice';
import { WorkflowDetail } from '../../types';

const WorkflowEditorPage: React.FC = () => {
  const dispatch: AppDispatch = useDispatch();
  const location = useLocation();
  const { workflow_uuid } = useParams<{ workflow_uuid: string }>();
  const { message } = AntApp.useApp();

  const {
    contextMenu,
  } = useSelector((state: RootState) => state.workflowEditor);

  const containerRefCallback = React.useCallback((node: HTMLDivElement) => {
    if (node) {
      dispatch(initializeGraph(node));
    }
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchDiyFunctions()).unwrap().catch(() => message.error('加载自定义组件失败'));

    if (workflow_uuid) {
      dispatch(fetchWorkflow(workflow_uuid));
    } else {
      dispatch(clearWorkflow());
      const searchParams = new URLSearchParams(location.search);
      const projectName = searchParams.get('projectName');
      const projectCode = searchParams.get('projectCode');
      if (projectName && projectCode) {
        const initialWorkflowData: WorkflowDetail = {
          code: 0,
          name: 'new-workflow',
          uuid: '',
          project: projectName,
          projectCode: parseInt(projectCode, 10),
          projectName: projectName,
          releaseState: 'UNSUBMITTED',
          updateTime: '',
          schedule_text: '',
          schedule_human_readable: '',
          tasks: [],
          parameters: [],
          relations: [],
          filename: '',
          yaml_content: '',
          locations: '',
          schedule: '',
          local_status: 'new',
        };
        dispatch(setWorkflowData(initialWorkflowData));
      }
    }
  }, [workflow_uuid, message, dispatch, location.search]);

  const handleImport = (file: File) => {
    dispatch(importYaml(file)).unwrap()
      .catch(() => message.error('导入 YAML 失败'));
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)' }}>
      <div style={{ flex: 1, position: 'relative' }} onClick={() => dispatch(setContextMenu({ ...contextMenu, visible: false }))}>
        <WorkflowToolbar onImport={handleImport} />
        <EditorDagGraph containerRef={containerRefCallback} />
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
