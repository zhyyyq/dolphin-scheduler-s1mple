import React, { useState, useEffect } from 'react';
import { Table, Spin, Alert, Typography } from 'antd';
import { Link } from 'react-router-dom';

const { Title } = Typography;

function Home() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const columns = [
    {
      title: 'Project Name',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => <Link to={`/project/${record.code}`}>{text}</Link>,
    },
    {
      title: 'Created by',
      dataIndex: 'userName',
      key: 'userName',
    },
    {
      title: 'Last updated',
      dataIndex: 'updateTime',
      key: 'updateTime',
    },
  ];

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/api/projects');
        if (!response.ok) {
          throw new Error('Failed to fetch projects from DolphinScheduler');
        }
        const data = await response.json();
        setProjects(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><Spin size="large" /></div>;
  }

  if (error) {
    return <Alert message="Error" description={error} type="error" showIcon />;
  }

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>DolphinScheduler Projects</Title>
      <Table 
        columns={columns} 
        dataSource={projects} 
        rowKey="code" 
        bordered
      />
    </div>
  );
}

export default Home;
