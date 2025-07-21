import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Table, Spin, Alert, Typography, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Commit } from '../types';
import api from '../api';

const { Title } = Typography;

const WorkflowHistoryPage: React.FC = () => {
  const { workflowName } = useParams<{ workflowName: string }>();
  const [history, setHistory] = useState<Commit[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!workflowName) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<Commit[]>(`/api/workflow/${workflowName}/history`);
      setHistory(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [workflowName]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const columns: ColumnsType<Commit> = [
    {
      title: 'Commit Hash',
      dataIndex: 'hash',
      key: 'hash',
      render: (hash) => <code>{hash.substring(0, 7)}</code>,
    },
    {
      title: 'Message',
      dataIndex: 'message',
      key: 'message',
    },
    {
      title: 'Author',
      dataIndex: 'author',
      key: 'author',
    },
    {
      title: 'Date',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (timestamp) => new Date(timestamp * 1000).toLocaleString(),
    },
  ];

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><Spin size="large" /></div>;
  }

  if (error) {
    return <Alert message="Error" description={error} type="error" showIcon />;
  }

  return (
    <div style={{ padding: '24px', background: '#fff', borderRadius: '8px' }}>
      <Title level={2} style={{ marginBottom: '24px' }}>History for {workflowName}</Title>
      <Table 
        columns={columns} 
        dataSource={history} 
        rowKey="hash" 
        bordered
      />
    </div>
  );
};

export default WorkflowHistoryPage;
