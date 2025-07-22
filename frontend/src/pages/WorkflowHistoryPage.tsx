import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Table, Spin, Alert, Typography, Button, App as AntApp } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Diff, Hunk, parseDiff } from 'react-diff-view';
import 'react-diff-view/style/index.css';
import { Commit } from '../types';
import api from '../api';

const { Title } = Typography;

interface DeletedWorkflow {
  filename: string;
  commit_hash: string;
}

const DiffViewer: React.FC<{ commit: Commit; workflowUuid: string }> = ({ commit, workflowUuid }) => {
  const [diff, setDiff] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDiff = async () => {
      try {
        const response = await api.get<{ diff: string }>(`/api/workflow/${workflowUuid}/commit/${commit.hash}`);
        setDiff(response.diff);
      } catch (error) {
        console.error("Failed to fetch diff:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDiff();
  }, [commit.hash, workflowUuid]);

  if (loading) return <Spin />;
  if (!diff) return <Alert message="Could not load diff." type="error" />;

  const files = parseDiff(diff);

  return (
    <div style={{ background: '#fff', padding: '12px', border: '1px solid #f0f0f0' }}>
      {files.map(({ oldRevision, newRevision, type, hunks }) => (
        <Diff key={`${oldRevision}-${newRevision}`} viewType="split" diffType={type} hunks={hunks} />
      ))}
    </div>
  );
};

const WorkflowHistoryPage: React.FC = () => {
  const { workflow_uuid } = useParams<{ workflow_uuid: string }>();
  const [history, setHistory] = useState<Commit[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { message } = AntApp.useApp();

  const fetchHistory = useCallback(async () => {
    if (!workflow_uuid) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<Commit[]>(`/api/workflow/${workflow_uuid}/history`);
      setHistory(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [workflow_uuid]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleRevert = async (commit: Commit) => {
    if (!workflow_uuid) return;
    try {
      await api.post('/api/workflow/revert', {
        workflow_uuid: workflow_uuid,
        commit_hash: commit.hash,
      });
      message.success(`成功回退到版本 ${commit.hash.substring(0, 7)}`);
      fetchHistory(); // Refresh the history
    } catch (error: any) {
      message.error(`回退失败: ${error.message}`);
    }
  };

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
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Button type="primary" onClick={() => handleRevert(record)}>
          回退到此版本
        </Button>
      ),
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
      <Title level={2} style={{ marginBottom: '24px' }}>History for {workflow_uuid}</Title>
      <Table
        columns={columns}
        dataSource={history}
        rowKey="hash"
        bordered
        expandable={{
          expandedRowRender: (record) => <DiffViewer commit={record} workflowUuid={workflow_uuid!} />,
          rowExpandable: () => true,
        }}
      />
    </div>
  );
};

export default WorkflowHistoryPage;
