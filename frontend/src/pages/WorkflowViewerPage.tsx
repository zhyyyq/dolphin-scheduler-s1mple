import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Spin, Alert, Card, Typography } from 'antd';
import DagGraph from '../components/DagGraph';
import { PreviewData } from '../types';
import api from '../api';

const { Title } = Typography;

const WorkflowViewerPage: React.FC = () => {
  const { projectCode, workflowCode } = useParams<{ projectCode: string; workflowCode: string }>();
  const [workflow, setWorkflow] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkflow = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<PreviewData>(`/api/project/${projectCode}/workflow/${workflowCode}`);
      setWorkflow(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [projectCode, workflowCode]);

  useEffect(() => {
    fetchWorkflow();
  }, [fetchWorkflow]);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><Spin size="large" /></div>;
  }

  if (error) {
    return <Alert message="Error" description={error} type="error" showIcon />;
  }

  if (!workflow) {
    return <Alert message="No data" description="Could not load workflow details." type="info" showIcon />;
  }

  return (
    <Card>
      <Title level={2}>Workflow: {workflow.name}</Title>
      <div style={{ height: 'calc(100vh - 250px)' }}>
        <DagGraph data={workflow} />
      </div>
    </Card>
  );
};

export default WorkflowViewerPage;
