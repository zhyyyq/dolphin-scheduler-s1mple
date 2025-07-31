import React, { useCallback } from 'react';
import { Button, Space, App as AntApp } from 'antd';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Workflow } from '../../../types';
import { AppDispatch } from '../../../store';
import { deleteWorkflow, onlineWorkflow, setSelectedWorkflow, setIsBackfillModalOpen } from '../../../store/slices/homeSlice';

interface ActionButtonsProps {
  record: Workflow;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({ record }) => {
  const dispatch: AppDispatch = useDispatch();
  const { message } = AntApp.useApp();
  const workflowUuid = record.uuid;

  const handleDelete = useCallback(async () => {
    try {
      await dispatch(deleteWorkflow(record)).unwrap();
      message.success('工作流删除成功。');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      message.error(errorMessage);
    }
  }, [dispatch, record, message]);

  const handleExecute = useCallback(() => {
    dispatch(setSelectedWorkflow(record));
    dispatch(setIsBackfillModalOpen(true));
  }, [dispatch, record]);

  const handleOnline = useCallback(async () => {
    try {
      await dispatch(onlineWorkflow(record)).unwrap();
      message.success('工作流上线/同步成功。');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      message.error(`上线工作流时出错: ${errorMessage}`);
    }
  }, [dispatch, record, message]);

  const handleSubmit = useCallback(() => {
    handleOnline();
  }, [handleOnline]);

  return (
    <Space size="middle">
      {record.releaseState === 'MODIFIED' ? (
        <Button type="primary" onClick={handleOnline}>同步</Button>
      ) : record.releaseState === 'ONLINE' ? (
        <Button type="primary" onClick={handleExecute}>立即执行</Button>
      ) : null}
      
      {record.releaseState === 'UNSUBMITTED' && (
        <Button type="primary" onClick={handleSubmit}>提交</Button>
      )}
      {record.releaseState === 'OFFLINE' && (
        <Button type="primary" onClick={handleOnline}>上线</Button>
      )}
      <Link to={`/workflow/edit/${workflowUuid}`}>编辑</Link>
      <Link to={`/workflow/${workflowUuid}/history`}>历史</Link>
      <Button type="link" danger onClick={handleDelete}>删除</Button>
    </Space>
  );
};
