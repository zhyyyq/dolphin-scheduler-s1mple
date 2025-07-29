import React, { useState, useEffect, useCallback } from 'react';
import { Row, Col, Card, Spin, Alert, DatePicker, Select, Button } from 'antd';
import { Line, Bar, Gauge } from '@ant-design/plots';
import api from '../api';

const { RangePicker } = DatePicker;
const { Option } = Select;

const DashboardPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<{ code: number; name: string }[]>([]);
  const [workflows, setWorkflows] = useState<{ code: number; name: string }[]>([]);
  const [dashboardData, setDashboardData] = useState<any>({
    projectHealth: 0,
    workflowHealth: 0,
    taskHealth: 0,
    resourceUtilization: 0,
    workflowTrend: [],
    taskTrend: [],
    failedTasks: [],
    slowTasks: [],
    slowWorkflows: [],
    ganttData: [],
  });
  const [filters, setFilters] = useState({
    timeRange: [null, null],
    projectCode: null,
    workflowCode: null,
  });

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        startTime: filters.timeRange[0] ? (filters.timeRange[0] as any).format('YYYY-MM-DD HH:mm:ss') : undefined,
        endTime: filters.timeRange[1] ? (filters.timeRange[1] as any).format('YYYY-MM-DD HH:mm:ss') : undefined,
        projectCode: filters.projectCode,
        workflowCode: filters.workflowCode,
      };
      const data = await api.get('/api/dashboard/stats', params);
      setDashboardData(data);
    } catch (err) {
      setError('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchProjects = useCallback(async () => {
    try {
      const data = await api.get<{ code: number; name: string }[]>('/api/projects');
      setProjects(data);
    } catch (err) {
      setError('Failed to fetch projects');
    }
  }, []);

  const fetchWorkflows = useCallback(async (projectCode: number | null) => {
    try {
      const params = projectCode ? { projectCode } : {};
      const data = await api.get<{ code: number; name: string }[]>('/api/workflow/combined', params);
      setWorkflows(data);
    } catch (err) {
      setError('Failed to fetch workflows');
    }
  }, []);

  useEffect(() => {
    fetchProjects();
    fetchWorkflows(null);
    fetchDashboardData();
  }, [fetchProjects, fetchWorkflows, fetchDashboardData]);

  const handleFilterChange = (changedFilters: any) => {
    setFilters(prev => ({ ...prev, ...changedFilters }));
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><Spin size="large" /></div>;
  }

  if (error) {
    return <Alert message="错误" description={error} type="error" showIcon />;
  }

  return (
    <div style={{ padding: '24px', background: '#f0f2f5' }}>
      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={16}>
          <Col>
            <RangePicker onChange={(dates) => handleFilterChange({ timeRange: dates })} />
          </Col>
          <Col>
            <Select
              style={{ width: 200 }}
              placeholder="选择项目"
              onChange={(value) => {
                handleFilterChange({ projectCode: value });
                fetchWorkflows(value);
              }}
              allowClear
            >
              {projects.map(p => <Option key={p.code} value={p.code}>{p.name}</Option>)}
            </Select>
          </Col>
          <Col>
            <Select
              style={{ width: 200 }}
              placeholder="选择工作流"
              onChange={(value) => handleFilterChange({ workflowCode: value })}
              allowClear
            >
              {workflows.map(w => <Option key={w.code} value={w.code}>{w.name}</Option>)}
            </Select>
          </Col>
          <Col>
            <Button type="primary" onClick={fetchDashboardData}>查询</Button>
          </Col>
        </Row>
      </Card>

      <Row gutter={[24, 24]}>
        <Col span={6}>
          <Card title="项目健康度">
            <Gauge percent={dashboardData.projectHealth} />
          </Card>
        </Col>
        <Col span={6}>
          <Card title="工作流健康度">
            <Gauge percent={dashboardData.workflowHealth} />
          </Card>
        </Col>
        <Col span={6}>
          <Card title="任务健康度">
            <Gauge percent={dashboardData.taskHealth} />
          </Card>
        </Col>
        <Col span={6}>
          <Card title="资源利用率">
            <Gauge percent={dashboardData.resourceUtilization} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]} style={{ marginTop: '24px' }}>
        <Col span={12}>
          <Card title="工作流实例趋势">
            <Line data={dashboardData.workflowTrend} xField="date" yField="count" seriesField="status" />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="任务实例趋势">
            <Line data={dashboardData.taskTrend} xField="date" yField="count" seriesField="status" />
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]} style={{ marginTop: '24px' }}>
        <Col span={8}>
          <Card title="失败任务 Top 10">
            <Bar data={dashboardData.failedTasks} xField="count" yField="name" seriesField="name" />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="耗时任务 Top 10">
            <Bar data={dashboardData.slowTasks} xField="duration" yField="name" seriesField="name" />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="耗时工作流 Top 10">
            <Bar data={dashboardData.slowWorkflows} xField="duration" yField="name" seriesField="name" />
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]} style={{ marginTop: '24px' }}>
        <Col span={24}>
          <Card title="工作流实例甘特图">
            <Bar
              data={dashboardData.ganttData}
              xField="duration"
              yField="name"
              seriesField="status"
              isStack={true}
              label={{
                position: 'middle',
                layout: [{ type: 'interval-adjust-position' }],
              }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardPage;
