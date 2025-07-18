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

const STATE_MAP = {
  SUCCESS: '成功',
  FAILURE: '失败',
  RUNNING_EXECUTION: '运行中',
  STOP: '停止',
  KILL: '终止',
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
    { name: '成功', value: stats.success },
    { name: '失败', value: stats.failure },
    { name: '运行中', value: stats.running },
    { name: '其他', value: stats.other },
  ];

  const recentInstancesColumns = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '状态', dataIndex: 'state', key: 'state', render: state => {
        const stateText = STATE_MAP[state] || state;
        const stateColor = state === 'SUCCESS' ? 'success' : state.includes('FAIL') ? 'error' : 'processing';
        return <Tag color={stateColor}>{stateText}</Tag>;
      }
    },
    { title: '开始时间', dataIndex: 'startTime', key: 'startTime' },
    { title: '结束时间', dataIndex: 'endTime', key: 'endTime' },
  ];

  return (
    <div>
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic title="成功" value={stats.success} prefix={<CheckCircleOutlined />} valueStyle={{ color: COLORS.success }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="失败" value={stats.failure} prefix={<CloseCircleOutlined />} valueStyle={{ color: COLORS.failure }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="运行中" value={stats.running} prefix={<SyncOutlined spin />} valueStyle={{ color: COLORS.running }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="总计" value={stats.total} />
          </Card>
        </Col>
      </Row>
      <Row gutter={16} style={{ marginTop: '24px' }}>
        <Col span={8}>
          <Card title="执行状态分布">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label>
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.name.toLowerCase().replace(' ', '')]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col span={16}>
          <Card title="最近工作流实例">
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
