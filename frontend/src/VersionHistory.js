import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { List, Spin, Alert, Typography, Modal, Card } from 'antd';
import ReactDiffViewer from 'react-diff-viewer';
import moment from 'moment';

const { Title, Text } = Typography;

function VersionHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCommit, setSelectedCommit] = useState(null);
  const [diffContent, setDiffContent] = useState('');
  const [isDiffModalVisible, setIsDiffModalVisible] = useState(false);
  const { workflowName } = useParams();

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const response = await fetch(`http://127.0.0.1:8000/api/workflow/${workflowName}/history`);
        if (!response.ok) {
          throw new Error('Failed to fetch workflow history');
        }
        const data = await response.json();
        setHistory(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [workflowName]);

  const handleViewDiff = async (commit) => {
    setSelectedCommit(commit);
    setIsDiffModalVisible(true);
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/workflow/${workflowName}/commit/${commit.hash}`);
      if (!response.ok) {
        throw new Error('Failed to fetch commit diff');
      }
      const data = await response.json();
      setDiffContent(data.diff);
    } catch (err) {
      setDiffContent(`Error loading diff: ${err.message}`);
    }
  };

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
            actions={index < history.length - 1 ? [<a onClick={() => handleViewDiff(item)}>查看差异</a>] : []}
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
        <ReactDiffViewer 
          oldValue={diffContent} 
          newValue={diffContent} 
          splitView={true} 
          hideLineNumbers={false}
          showDiffOnly={false}
        />
      </Modal>
    </Card>
  );
}

export default VersionHistory;
