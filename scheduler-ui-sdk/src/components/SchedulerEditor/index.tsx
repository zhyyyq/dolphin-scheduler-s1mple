import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import './index.less';
import { App as AntApp, Modal } from 'antd';
import './components/TaskNode'; // Register custom node
import EditorDagGraph from './components/EditorDagGraph';
import { WorkflowToolbar } from './components/WorkflowToolbar';
import EditTaskModal from './components/EditTaskModal';
import EditParamNodeModal from './components/EditParamNodeModal';
import EditEdgeLabelModal from './components/EditEdgeLabelModal';
import { ViewYamlModal } from './components/ViewYamlModal';
import { WorkflowContextMenu } from './components/WorkflowContextMenu';
import { RootState, AppDispatch } from '@/store';
import {
  setContextMenu,
  fetchDiyFunctions,
  fetchWorkflow,
  setWorkflowData,
  clearWorkflow,
  initializeGraph,
  WorkflowData,
} from '@/store/slices/workflowEditorSlice';

const SchedulerEditor: React.FC<{ modal_mode: boolean, workflow_id: string | null } > = (props) => {
  const dispatch: AppDispatch = useDispatch();
  const { message } = AntApp.useApp();
  const { workflow_id } = props;
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
    if (workflow_id) {
      dispatch(fetchWorkflow(workflow_id));
    } else {
      dispatch(clearWorkflow());
      const searchParams = new URLSearchParams(location.search);
      const projectName = searchParams.get('projectName');
      const projectCode = searchParams.get('projectCode');
      if (projectName && projectCode) {
        const initialWorkflowData: WorkflowData = {
          id: '',
          processDefinitionCode: undefined,
          version: 0,
          releaseState: '',
          updateTime: '',
          yaml_content: {
            workflow: undefined,
            tasks: [],
            locations: undefined,
            parameters: undefined
          },
          yaml_content_raw: ''
        };
        dispatch(setWorkflowData(initialWorkflowData));
      }
    }
  }, [workflow_id, message, dispatch, location.search]);
  if (props.modal_mode) {
    return <Modal open={true} width="80%" title="工作流编辑器" footer={null} onCancel={() => {
      const event = new CustomEvent('workflow_edit_end', {
        detail: "user canceled"
      });
      document.querySelector("scheduler-editor")?.dispatchEvent(event);
    }}>
      <div style={{ display: 'flex', height: '70vh' }}>
        <div style={{ flex: 1, position: 'relative' }} onClick={() => dispatch(setContextMenu({ ...contextMenu, visible: false }))}>
          <WorkflowToolbar />
          <EditorDagGraph containerRef={containerRefCallback} />
          <EditTaskModal />
          <EditParamNodeModal />
          <EditEdgeLabelModal />
          <ViewYamlModal />
          <WorkflowContextMenu />
        </div>
      </div>
    </Modal>
  }

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ flex: 1, position: 'relative' }} onClick={() => dispatch(setContextMenu({ ...contextMenu, visible: false }))}>
        <WorkflowToolbar />
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

export default SchedulerEditor;
