import React, { useState, useEffect } from 'react';
import {
  Table, Spin, Alert, Typography, Tag, Button, Space,
  message
 } from 'antd';
import { Link } from 'react-router-dom';

const { Title } = Typography;

function Home() {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const handleDelete = async (record) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/project/${record.projectCode}/workflow/${record.code}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete workflow.');
      }
      message.success('Workflow deleted successfully.');
      // Refresh the list after deletion
      fetchWorkflows();
    } catch (error) {
      message.error(error.message);
    }
  };

  const columns = [
    {
      title: 'Workflow Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Project',
      dataIndex: 'projectName',
      key: 'projectName',
    },
    {
      title: 'State',
      dataIndex: 'releaseState',
      key: 'releaseState',
      render: state => (
        <Tag color={state === 'ONLINE' ? 'green' : 'volcano'} key={state}>
          {state}
        </Tag>
      ),
    },
    {
      title: 'Last updated',
      dataIndex: 'updateTime',
      key: 'updateTime',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Link to={`/project/${record.projectCode}/workflow/${record.code}`}>View</Link>
          <Link to={`/upload?projectCode=${record.projectCode}&workflowCode=${record.code}`}>Edit</Link>
          <Button type="link" danger onClick={() => handleDelete(record)}>Delete</Button>
        </Space>
      ),
    },
  ];

  const fetchWorkflows = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/workflows');
      if (!response.ok) {
        throw new Error('Failed to fetch workflows from DolphinScheduler');
      }
      const data = await response.json();
      setWorkflows(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><Spin size="large" /></div>;
  }

  if (error) {
    return <Alert message="Error" description={error} type="error" showIcon />;
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Title level={2} style={{ margin: 0 }}>All Workflows</Title>
        <Link to="/upload">
          <Button type="primary">New Workflow</Button>
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
}

export default Home;
