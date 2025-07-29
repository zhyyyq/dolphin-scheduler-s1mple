import React from 'react';
import { Button, Space } from 'antd';
import { Link } from 'react-router-dom';
import { Workflow } from '../../../types';

interface ActionButtonsProps {
  record: Workflow;
  onDelete: (record: Workflow) => void;
  onSubmit: (record: Workflow) => void;
  onExecute: (record: Workflow) => void;
  onOnline: (record: Workflow) => void;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({ record, onDelete, onSubmit, onExecute, onOnline }) => {
  const workflowUuid = record.uuid;

  return (
    <Space size="middle">
      {record.releaseState === 'MODIFIED' ? (
        <Button type="primary" onClick={() => onOnline(record)}>同步</Button>
      ) : record.releaseState === 'ONLINE' ? (
        <Button type="primary" onClick={() => onExecute(record)}>立即执行</Button>
      ) : null}
      
      {record.releaseState === 'UNSUBMITTED' && (
        <Button type="primary" onClick={() => onSubmit(record)}>提交</Button>
      )}
      {record.releaseState === 'OFFLINE' && (
        <Button type="primary" onClick={() => onOnline(record)}>上线</Button>
      )}
      <Link to={`/workflow/edit/${workflowUuid}`}>编辑</Link>
      <Link to={`/workflow/${workflowUuid}/history`}>历史</Link>
      <Button type="link" danger onClick={() => onDelete(record)}>删除</Button>
    </Space>
  );
};
