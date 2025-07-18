import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Spin, Alert } from 'antd';
import DagGraph from './DagGraph';

function WorkflowViewer() {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { projectCode, workflowCode } = useParams();

  useEffect(() => {
    const fetchWorkflow = async () => {
      setLoading(true);
      try {
        const response = await fetch(`http://127.0.0.1:8000/api/project/${projectCode}/workflow/${workflowCode}`);
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.detail || 'Failed to fetch workflow details');
        }
        const data = await response.json();
        // The data from the backend is already in the format that DagGraph expects
        setPreview(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkflow();
  }, [projectCode, workflowCode]);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><Spin size="large" /></div>;
  }

  if (error) {
    return <Alert message="Error" description={error} type="error" showIcon style={{ margin: '24px' }} />;
  }

  return (
    <DagGraph data={preview} />
  );
}

export default WorkflowViewer;
