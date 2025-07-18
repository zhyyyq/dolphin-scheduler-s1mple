import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Spin, Alert, Table, Tag } from 'antd';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CheckCircleOutlined, CloseCircleOutlined, SyncOutlined } from '@ant-design/icons';

const COLORS = {
  success: '#87d068',
  failure: '#f50',
  running: '#2db7f5',
  other: '#108ee9',
};

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/api/dashboard/stats');
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard stats');
        }
        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><Spin size="large" /></div>;
  }

  if (error) {
    return <Alert message="Error" description={error} type="error" showIcon />;
  }

  const pieData = [
    { name: 'Success', value: stats.success },
    { name: 'Failure', value: stats.failure },
    { name: 'Running', value: stats.running },
    { name: 'Other', value: stats.other },
  ];

  const recentInstancesColumns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'State', dataIndex: 'state', key: 'state', render: state => <Tag color={COLORS[state.toLowerCase()] || 'default'}>{state}</Tag> },
    { title: 'Start Time', dataIndex: 'startTime', key: 'startTime' },
    { title: 'End Time', dataIndex: 'endTime', key: 'endTime' },
  ];

  return (
    <div>
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic title="Successful" value={stats.success} prefix={<CheckCircleOutlined />} valueStyle={{ color: COLORS.success }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Failed" value={stats.failure} prefix={<CloseCircleOutlined />} valueStyle={{ color: COLORS.failure }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Running" value={stats.running} prefix={<SyncOutlined spin />} valueStyle={{ color: COLORS.running }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Total" value={stats.total} />
          </Card>
        </Col>
      </Row>
      <Row gutter={16} style={{ marginTop: '24px' }}>
        <Col span={8}>
          <Card title="Execution Status Distribution">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label>
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.name.toLowerCase()]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col span={16}>
          <Card title="Recent Workflow Instances">
            <Table
              columns={recentInstancesColumns}
              dataSource={stats.recent_instances}
              rowKey="id"
              size="small"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default Dashboard;
