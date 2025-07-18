import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Table, Spin, Alert, Typography, Tag, Button, Space,
  App as AntApp
} from 'antd';
import { Link } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { Workflow } from '../types';

const { Title } = Typography;

interface ActionButtonsProps {
  record: Workflow;
  onDelete: (record: Workflow) => void;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({ record, onDelete }) => (
  <Space size="middle">
    <Link to={`/project/${record.projectCode}/workflow/${record.code}`}>查看</Link>
    <Link to={`/upload?workflowName=${record.name}.py`}>修改</Link>
    <Link to={`/workflow/${record.name}.py/history`}>历史</Link>
    <Button type="link" danger onClick={() => onDelete(record)}>删除</Button>
  </Space>
);

const HomePage: React.FC = () => {
  const { message } = AntApp.useApp();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkflows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/workflows');
      if (!response.ok) {
        throw new Error('Failed to fetch workflows from DolphinScheduler');
      }
      const data: Workflow[] = await response.json();
      setWorkflows(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  const handleDelete = useCallback(async (record: Workflow) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/project/${record.projectCode}/workflow/${record.code}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete workflow.');
      }
      message.success('Workflow deleted successfully.');
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
      render: (state: Workflow['releaseState']) => (
        <Tag color={state === 'ONLINE' ? 'green' : 'volcano'} key={state}>
          {state === 'ONLINE' ? '在线' : '离线'}
        </Tag>
      ),
    },
    {
      title: '最后更新时间',
      dataIndex: 'updateTime',
      key: 'updateTime',
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => <ActionButtons record={record} onDelete={handleDelete} />,
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
        <Link to="/upload">
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
