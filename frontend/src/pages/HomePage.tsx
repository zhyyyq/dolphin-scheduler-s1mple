import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Table, Spin, Alert, Typography, Tag, Button, Space, Tooltip,
  App as AntApp
} from 'antd';
import { Link, useLocation } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { Workflow } from '../types';
import api from '../api';
import RestoreWorkflowModal from '../components/RestoreWorkflowModal';
import BackfillModal from '../components/BackfillModal';

const { Title } = Typography;

interface ActionButtonsProps {
  record: Workflow;
  onDelete: (record: Workflow) => void;
  onSubmit: (record: Workflow) => void;
  onExecute: (record: Workflow) => void;
  onOnline: (record: Workflow) => void;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({ record, onDelete, onSubmit, onExecute, onOnline }) => {
  const workflowUuid = record.uuid;

  const isModified = record.releaseState === 'ONLINE' && record.local_status === 'modified';

  return (
    <Space size="middle">
      {isModified ? (
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

const HomePage: React.FC = () => {
  const { message } = AntApp.useApp();
  const location = useLocation();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [isBackfillModalOpen, setIsBackfillModalOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);

  const fetchWorkflows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const combinedWorkflows = await api.get<Workflow[]>('/api/workflows/combined');
      setWorkflows(combinedWorkflows);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows, location]);

  const handleDelete = useCallback(async (record: Workflow) => {
    try {
      const params: { project_code?: number; workflow_code?: number } = {};
      // Only add DS-related codes if they exist and are valid.
      // `record.code` for local files is a string filename, so we must not send it.
      if (record.projectCode && typeof record.code === 'number') {
        params.project_code = record.projectCode;
        params.workflow_code = record.code;
      }

      await api.delete(`/api/workflow/${record.uuid}`, params);
      message.success('工作流删除成功。');
      fetchWorkflows();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      message.error(errorMessage);
    }
  }, [fetchWorkflows, message]);

  const handleSubmit = useCallback(async (record: Workflow) => {
    try {
      await api.post('/api/workflow/submit', { filename: record.code });
      message.success('工作流提交成功。');
      fetchWorkflows();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      message.error(errorMessage);
    }
  }, [fetchWorkflows, message]);

  const handleExecute = useCallback((record: Workflow) => {
    setSelectedWorkflow(record);
    setIsBackfillModalOpen(true);
  }, []);

  const handleOnline = useCallback(async (record: Workflow) => {
    try {
      await api.post(`/api/workflow/${record.uuid}/online`);
      message.success('工作流上线成功。');
      fetchWorkflows();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      message.error(errorMessage);
    }
  }, [fetchWorkflows, message]);

  const columns: ColumnsType<Workflow> = useMemo(() => [
    {
      title: '工作流名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '定时设置',
      dataIndex: 'schedule_human_readable',
      key: 'schedule_human_readable',
      render: (text: string, record: Workflow) => (
        <Tooltip title={record.schedule_text}>
          <span>{text || '-'}</span>
        </Tooltip>
      ),
    },
    {
      title: '状态',
      dataIndex: 'releaseState',
      key: 'releaseState',
      render: (state: Workflow['releaseState'], record: Workflow) => {
        if (state === 'ONLINE' && record.local_status === 'modified') {
          return <Tag color="processing">待更新</Tag>;
        }

        let color = 'default';
        let text = state;
        if (state === 'ONLINE') {
          color = 'green';
          text = '在线' as any;
        } else if (state === 'OFFLINE') {
          color = 'volcano';
          text = '离线' as any;
        } else if (state === 'UNSUBMITTED') {
          color = 'gold';
          text = '待提交' as any;
        }
        return <Tag color={color} key={state}>{text}</Tag>;
      },
    },
    {
      title: '最后更新时间',
      dataIndex: 'updateTime',
      key: 'updateTime',
      render: (time: string | number) => {
        if (typeof time === 'number') {
          return new Date(time * 1000).toLocaleString();
        }
        // Assuming it's a date string from DS
        return new Date(time).toLocaleString();
      },
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => <ActionButtons record={record} onDelete={handleDelete} onSubmit={handleSubmit} onExecute={handleExecute} onOnline={handleOnline} />,
    },
  ], [handleDelete]);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><Spin size="large" /></div>;
  }

  if (error) {
    return <Alert message="错误" description={error} type="error" showIcon />;
  }

  return (
    <div style={{ padding: '24px', background: '#fff', borderRadius: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Title level={2} style={{ margin: 0 }}>所有工作流</Title>
        <Space>
          <Button onClick={() => setIsRestoreModalOpen(true)}>恢复工作流</Button>
          <Link to="/workflow/edit">
            <Button type="primary">新建工作流</Button>
          </Link>
        </Space>
      </div>
      <Table 
        columns={columns} 
        dataSource={workflows} 
        rowKey="uuid" 
        bordered
      />
      <RestoreWorkflowModal
        open={isRestoreModalOpen}
        onCancel={() => setIsRestoreModalOpen(false)}
        onRestored={() => {
          setIsRestoreModalOpen(false);
          fetchWorkflows();
        }}
      />
      <BackfillModal
        open={isBackfillModalOpen}
        workflow={selectedWorkflow}
        onCancel={() => setIsBackfillModalOpen(false)}
        onSuccess={() => {
          setIsBackfillModalOpen(false);
          fetchWorkflows();
        }}
      />
    </div>
  );
};

export default HomePage;
