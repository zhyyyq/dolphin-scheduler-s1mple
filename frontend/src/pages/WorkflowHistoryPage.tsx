import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Table, Spin, Alert, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Diff, Hunk, parseDiff } from 'react-diff-view';
import 'react-diff-view/style/index.css';
import { Commit } from '../types';
import api from '../api';

const { Title } = Typography;

const DiffViewer: React.FC<{ commit: Commit; workflowName: string }> = ({ commit, workflowName }) => {
  const [diff, setDiff] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDiff = async () => {
      try {
        const response = await api.get<{ diff: string }>(`/api/workflow/${workflowName}/commit/${commit.hash}`);
        setDiff(response.diff);
      } catch (error) {
        console.error("Failed to fetch diff:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDiff();
  }, [commit.hash, workflowName]);

  if (loading) return <Spin />;
  if (!diff) return <Alert message="Could not load diff." type="error" />;

  const files = parseDiff(diff);

  return (
    <div style={{ background: '#fff', padding: '12px', border: '1px solid #f0f0f0' }}>
      {files.map(({ oldRevision, newRevision, type, hunks }) => (
        <Diff key={`${oldRevision}-${newRevision}`} viewType="split" diffType={type} hunks={hunks}>
          {hunks => hunks.map(hunk => <Hunk key={hunk.content} hunk={hunk} />)}
        </Diff>
      ))}
    </div>
  );
};

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
        expandable={{
          expandedRowRender: (record) => <DiffViewer commit={record} workflowName={workflowName!} />,
          rowExpandable: () => true,
        }}
      />
    </div>
  );
};

export default WorkflowHistoryPage;
