import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Row, Col, Card, Statistic, Spin, Alert, Table, Tag, App as AntApp } from 'antd';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CheckCircleOutlined, CloseCircleOutlined, SyncOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { DashboardStats, WorkflowInstance } from '../types';
import api from '../api';

const COLORS = {
  success: '#52c41a',
  failure: '#f5222d',
  running: '#1890ff',
  other: '#fa8c16',
};

const STATE_MAP: { [key: string]: string } = {
  SUCCESS: '成功',
  FAILURE: '失败',
  RUNNING_EXECUTION: '运行中',
  STOP: '停止',
  KILL: '终止',
};

interface StatCardProps {
  title: string;
  value: number;
  color: string;
  icon: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, color, icon }) => (
  <Card>
    <Statistic title={title} value={value} valueStyle={{ color }} prefix={icon} />
  </Card>
);

const DashboardPage: React.FC = () => {
  const { message } = AntApp.useApp();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<DashboardStats>('/api/dashboard/stats');
      setStats(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const pieData = useMemo(() => {
    if (!stats) return [];
    const data = [
      { name: '成功', value: stats.success, color: COLORS.success },
      { name: '失败', value: stats.failure, color: COLORS.failure },
      { name: '运行中', value: stats.running, color: COLORS.running },
      { name: '其他', value: stats.other, color: COLORS.other },
    ];
    return data.filter(item => item.value > 0);
  }, [stats]);

  const recentInstancesColumns: ColumnsType<WorkflowInstance> = useMemo(() => [
    { title: '名称', dataIndex: 'name', key: 'name' },
    {
      title: '状态',
      dataIndex: 'state',
      key: 'state',
      render: (state: WorkflowInstance['state']) => {
        const stateText = STATE_MAP[state] || state;
        const stateColor = state === 'SUCCESS' ? 'success' : state.includes('FAIL') ? 'error' : 'processing';
        return <Tag color={stateColor}>{stateText}</Tag>;
      },
    },
    { title: '开始时间', dataIndex: 'startTime', key: 'startTime' },
    { title: '结束时间', dataIndex: 'endTime', key: 'endTime' },
  ], []);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><Spin size="large" /></div>;
  }

  if (error) {
    return <Alert message="错误" description={error} type="error" showIcon />;
  }

  if (!stats) {
    return <Alert message="无数据" description="无法加载仪表盘统计信息。" type="info" showIcon />;
  }

  return (
    <div style={{ padding: '24px', background: '#f0f2f5' }}>
      <Row gutter={[16, 16]}>
        <Col span={6}>
          <StatCard title="成功" value={stats.success} color={COLORS.success} icon={<CheckCircleOutlined />} />
        </Col>
        <Col span={6}>
          <StatCard title="失败" value={stats.failure} color={COLORS.failure} icon={<CloseCircleOutlined />} />
        </Col>
        <Col span={6}>
          <StatCard title="运行中" value={stats.running} color={COLORS.running} icon={<SyncOutlined spin />} />
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="总计" value={stats.total} />
          </Card>
        </Col>
      </Row>
      <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
        <Col span={8}>
          <Card title="执行状态分布" style={{ height: '100%' }}>
            {pieData.length > 1 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '300px', textAlign: 'center' }}>
                {pieData.length === 1 ? (
                  <>
                    <div style={{ fontSize: '32px', color: pieData[0].color, fontWeight: 'bold' }}>100%</div>
                    <div style={{ fontSize: '16px', marginTop: '8px' }}>{pieData[0].name}</div>
                  </>
                ) : (
                  <div style={{ color: '#8c8c8c', fontSize: '16px' }}>暂无执行数据</div>
                )}
              </div>
            )}
          </Card>
        </Col>
        <Col span={16}>
          <Card title="最近工作流实例" style={{ height: '100%' }}>
            <Table
              columns={recentInstancesColumns}
              dataSource={stats.recent_instances}
              rowKey="id"
              size="middle"
              pagination={{ pageSize: 5 }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardPage;
