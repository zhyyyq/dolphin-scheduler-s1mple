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
      render: state => (
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
      render: (_, record) => (
        <Space size="middle">
          <Link to={`/project/${record.projectCode}/workflow/${record.code}`}>查看</Link>
          <Link to={`/upload?projectCode=${record.projectCode}&workflowCode=${record.code}`}>修改</Link>
          <Button type="link" danger onClick={() => handleDelete(record)}>删除</Button>
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
}

export default Home;
