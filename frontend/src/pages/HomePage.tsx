import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Table, Spin, Alert, Typography, Tag, Button, Space,
  App as AntApp
} from 'antd';
import { Link, useLocation } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { Workflow } from '../types';
import api from '../api';

const { Title } = Typography;

interface ActionButtonsProps {
  record: Workflow;
  onDelete: (record: Workflow) => void;
  onSubmit: (record: Workflow) => void;
  onExecute: (record: Workflow) => void;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({ record, onDelete, onSubmit, onExecute }) => {
  const workflowUuid = record.uuid;

  return (
    <Space size="middle">
      {record.releaseState === 'ONLINE' && (
        <Button type="primary" onClick={() => onExecute(record)}>立即执行</Button>
      )}
      {record.releaseState === 'UNSUBMITTED' && (
        <Button type="primary" onClick={() => onSubmit(record)}>提交</Button>
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

  const fetchWorkflows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dsWorkflows, localWorkflows] = await Promise.all([
        api.get<Workflow[]>('/api/workflows'),
        api.get<Workflow[]>('/api/workflows/local')
      ]);

      const localWorkflowsMap = new Map(localWorkflows.map(wf => [wf.name, wf]));
      const dsWorkflowsMap = new Map(dsWorkflows.map(wf => [wf.name, wf]));

      const allWorkflowNames = new Set([...Array.from(localWorkflowsMap.keys()), ...Array.from(dsWorkflowsMap.keys())]);

      const combinedWorkflows = Array.from(allWorkflowNames).map(name => {
        const localWf = localWorkflowsMap.get(name);
        const dsWf = dsWorkflowsMap.get(name);

        if (dsWf && localWf) {
          // Both exist, merge them. DS is the source of truth for state.
          return {
            ...localWf, // start with local to get uuid, updateTime
            ...dsWf,    // overwrite with DS data
            uuid: localWf.uuid, // IMPORTANT: keep local uuid for editing
            isLocal: true, // It's editable locally
          };
        } else if (dsWf) {
          // Only exists in DolphinScheduler, not editable locally
          return { ...dsWf, isLocal: false, uuid: dsWf.uuid || `${dsWf.projectCode}-${dsWf.code}` };
        } else {
          // Only exists locally
          return { ...localWf, releaseState: 'UNSUBMITTED', isLocal: true };
        }
      }).filter(wf => wf) as Workflow[];

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
      if (record.isLocal) {
        await api.delete(`/api/workflow/${record.uuid}`);
      } else {
        await api.delete(`/api/ds/project/${record.projectCode}/workflow/${record.code}`);
      }
      message.success('Workflow deleted successfully.');
      fetchWorkflows();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      message.error(errorMessage);
    }
  }, [fetchWorkflows, message]);

  const handleSubmit = useCallback(async (record: Workflow) => {
    try {
      await api.post('/api/workflow/submit', { filename: record.code });
      message.success('Workflow submitted successfully.');
      fetchWorkflows();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      message.error(errorMessage);
    }
  }, [fetchWorkflows, message]);

  const handleExecute = useCallback(async (record: Workflow) => {
    try {
      await api.post(`/api/ds/execute/${record.projectCode}/${record.code}`, {
        scheduleTime: ''
      });
      message.success('Workflow execution started successfully.');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      message.error(errorMessage);
    }
  }, [message]);

  const columns: ColumnsType<Workflow> = useMemo(() => [
    {
      title: '工作流名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '状态',
      dataIndex: 'releaseState',
      key: 'releaseState',
      render: (state: Workflow['releaseState']) => {
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
      render: (_, record) => <ActionButtons record={record} onDelete={handleDelete} onSubmit={handleSubmit} onExecute={handleExecute} />,
    },
  ], [handleDelete]);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><Spin size="large" /></div>;
  }

  if (error) {
    return <Alert message="Error" description={error} type="error" showIcon />;
  }

  return (
    <div style={{ padding: '24px', background: '#fff', borderRadius: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Title level={2} style={{ margin: 0 }}>所有工作流</Title>
        <Link to="/workflow/edit">
          <Button type="primary">新建工作流</Button>
        </Link>
      </div>
      <Table 
        columns={columns} 
        dataSource={workflows} 
        rowKey="uuid" 
        bordered
      />
    </div>
  );
};

export default HomePage;
