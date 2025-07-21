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
}

const ActionButtons: React.FC<ActionButtonsProps> = ({ record, onDelete, onSubmit }) => {
  const projectCode = record.isLocal ? 'local' : record.projectCode;
  const workflowCode = record.isLocal ? record.code : record.code;

  return (
    <Space size="middle">
      {record.releaseState === 'UNSUBMITTED' && (
        <Button type="primary" onClick={() => onSubmit(record)}>提交</Button>
      )}
      <Link to={`/workflow/edit/${projectCode}/${workflowCode}`}>编辑</Link>
      <Link to={`/workflow/${record.code}/history`}>历史</Link>
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

      const dsWorkflowCodes = new Set(dsWorkflows.map(wf => wf.code));
      const combinedWorkflows = [...dsWorkflows];

      localWorkflows.forEach(localWf => {
        if (!dsWorkflowCodes.has(localWf.code)) {
          localWf.releaseState = 'UNSUBMITTED'; // Mark as to be submitted
          combinedWorkflows.push(localWf);
        }
      });

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
      const projectCode = record.isLocal ? 'local' : record.projectCode;
      const workflowCode = record.isLocal ? record.code : record.code;
      await api.delete(`/api/project/${projectCode}/workflow/${workflowCode}`);
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

  const columns: ColumnsType<Workflow> = useMemo(() => [
    {
      title: '工作流名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '所属项目',
      dataIndex: 'projectName',
      key: 'projectName',
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
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => <ActionButtons record={record} onDelete={handleDelete} onSubmit={handleSubmit} />,
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
        rowKey="code" 
        bordered
      />
    </div>
  );
};

export default HomePage;
