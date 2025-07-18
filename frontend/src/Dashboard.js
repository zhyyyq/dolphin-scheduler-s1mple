import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Spin, Alert, Table, Tag } from 'antd';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CheckCircleOutlined, CloseCircleOutlined, SyncOutlined } from '@ant-design/icons';

const COLORS = {
  success: '#52c41a', // 成功 - 绿色
  failure: '#f5222d', // 失败 - 红色
  running: '#1890ff', // 执行中 - 蓝色
  other: '#fa8c16',  // 其他 - 橙色
};

const PIE_COLORS = [COLORS.success, COLORS.failure, COLORS.running, COLORS.other];

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
    <div style={{ padding: '24px', background: '#fff', borderRadius: '8px' }}>
      <Row gutter={16}>
        <Col span={6}>
          <Card style={{ padding: '16px' }}>
            <Statistic 
              title="成功" 
              value={stats.success} 
              valueStyle={{ color: COLORS.success }}
              formatter={(value) => (
                <div style={{ color: COLORS.success }}>
                  <CheckCircleOutlined /> {value}
                </div>
              )}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card style={{ padding: '16px' }}>
            <Statistic 
              title="失败" 
              value={stats.failure} 
              valueStyle={{ color: COLORS.failure }}
              formatter={(value) => (
                <div style={{ color: COLORS.failure }}>
                  <CloseCircleOutlined /> {value}
                </div>
              )}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card style={{ padding: '16px' }}>
            <Statistic 
              title="运行中" 
              value={stats.running} 
              valueStyle={{ color: COLORS.running }}
              formatter={(value) => (
                <div style={{ color: COLORS.running }}>
                  <SyncOutlined spin /> {value}
                </div>
              )}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card style={{ padding: '16px' }}>
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
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col span={16}>
          <Card title="最近工作流实例" style={{ height: '100%' }}>
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
