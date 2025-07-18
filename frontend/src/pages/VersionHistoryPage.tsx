import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { List, Spin, Alert, Typography, Modal, Card, Button } from 'antd';
import { Diff, Hunk, parseDiff, FileData } from 'react-diff-view';
import 'react-diff-view/style/index.css';
import moment from 'moment';
import { Commit } from '../types';

const { Title, Text } = Typography;

interface DiffViewerProps {
  diff: FileData;
}

const DiffViewer: React.FC<DiffViewerProps> = ({ diff }) => {
  const renderFile = ({ oldRevision, newRevision, type, hunks }: FileData) => (
    <Diff key={oldRevision + '-' + newRevision} viewType="split" diffType={type} hunks={hunks}>
      {hunks => hunks.map(hunk => <Hunk key={hunk.content} hunk={hunk} />)}
    </Diff>
  );

  return renderFile(diff);
};

const VersionHistoryPage: React.FC = () => {
  const [history, setHistory] = useState<Commit[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCommit, setSelectedCommit] = useState<Commit | null>(null);
  const [diff, setDiff] = useState<FileData | null>(null);
  const [isDiffModalVisible, setIsDiffModalVisible] = useState<boolean>(false);
  const { workflowName } = useParams<{ workflowName: string }>();

  const fetchHistory = useCallback(async () => {
    if (!workflowName) return;
    setLoading(true);
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/workflow/${workflowName}/history`);
      if (!response.ok) {
        throw new Error('Failed to fetch workflow history');
      }
      const data: Commit[] = await response.json();
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

  const handleViewDiff = useCallback(async (commit: Commit) => {
    if (!workflowName) return;
    setSelectedCommit(commit);
    setIsDiffModalVisible(true);
    setDiff(null); // Reset diff while loading
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/workflow/${workflowName}/commit/${commit.hash}`);
      if (!response.ok) {
        throw new Error('Failed to fetch commit diff');
      }
      const data = await response.json();
      const [parsedDiff] = parseDiff(data.diff, { nearbySequences: 'zip' });
      setDiff(parsedDiff);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      setDiff(null);
    }
  }, [workflowName]);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><Spin size="large" /></div>;
  }

  if (error) {
    return <Alert message="错误" description={error} type="error" showIcon />;
  }

  return (
    <Card>
      <Title level={2}>版本历史: {workflowName}</Title>
      <List
        itemLayout="horizontal"
        dataSource={history}
        renderItem={(item, index) => (
          <List.Item
            actions={index < history.length - 1 ? [<Button type="link" onClick={() => handleViewDiff(item)}>查看差异</Button>] : []}
          >
            <List.Item.Meta
              title={<Text strong>{item.message}</Text>}
              description={`由 ${item.author} 提交于 ${moment.unix(item.timestamp).format('YYYY-MM-DD HH:mm:ss')}`}
            />
            <Text type="secondary">Commit: {item.hash.substring(0, 7)}</Text>
          </List.Item>
        )}
      />
      <Modal
        title={`变更详情: ${selectedCommit?.hash.substring(0, 7)}`}
        open={isDiffModalVisible}
        onCancel={() => setIsDiffModalVisible(false)}
        width="80%"
        footer={null}
      >
        {diff ? <DiffViewer diff={diff} /> : <Spin />}
      </Modal>
    </Card>
  );
};

export default VersionHistoryPage;
