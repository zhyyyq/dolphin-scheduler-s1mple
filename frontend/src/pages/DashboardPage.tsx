import React, { useState, useEffect, useCallback } from 'react';
import { Row, Col, Card, Spin, Alert, DatePicker, Select, Button, Statistic, Modal, Table } from 'antd';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../api';

const { RangePicker } = DatePicker;
const { Option } = Select;

const DashboardPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<{ code: number; name: string }[]>([]);
  const [dashboardData, setDashboardData] = useState<any>({
    workflowStatusCount: { success: 0, failure: 0, running: 0, waiting: 0 },
    taskStatusCount: { success: 0, failure: 0, running: 0, waiting: 0 },
  });
  const [filters, setFilters] = useState({
    timeRange: [dayjs().startOf('day'), dayjs().endOf('day')],
    projectCode: null,
  });

  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalData, setModalData] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        startTime: filters.timeRange[0] ? (filters.timeRange[0] as any).format('YYYY-MM-DDTHH:mm:ss') : undefined,
        endTime: filters.timeRange[1] ? (filters.timeRange[1] as any).format('YYYY-MM-DDTHH:mm:ss') : undefined,
        projectCode: filters.projectCode,
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

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleFilterChange = (changedFilters: any) => {
    setFilters(prev => ({ ...prev, ...changedFilters }));
  };

  const handleTimeRangeChange = (key: string) => {
    let timeRange: [dayjs.Dayjs, dayjs.Dayjs];
    if (key === 'today') {
      timeRange = [dayjs().startOf('day'), dayjs().endOf('day')];
    } else if (key === 'yesterday') {
      const yesterday = dayjs().subtract(1, 'day');
      timeRange = [yesterday.startOf('day'), yesterday.endOf('day')];
    } else {
      return;
    }
    handleFilterChange({ timeRange });
  };

  const handleStatusClick = async (type: 'workflow' | 'task', status: string) => {
    setModalTitle(`${type === 'workflow' ? '工作流' : '任务'}实例列表 - ${status}`);
    setModalVisible(true);
    setModalLoading(true);
    try {
      const params = {
        projectCode: filters.projectCode,
        startTime: filters.timeRange[0] ? (filters.timeRange[0] as any).format('YYYY-MM-DDTHH:mm:ss') : undefined,
        endTime: filters.timeRange[1] ? (filters.timeRange[1] as any).format('YYYY-MM-DDTHH:mm:ss') : undefined,
        stateType: status.toUpperCase(),
        pageNo: 1,
        pageSize: 100,
      };
      const endpoint = type === 'workflow' ? '/api/workflow/instances' : '/api/task/instances';
      const res = await api.get<any>(endpoint, params);
      setModalData(res.totalList || []);
    } catch (err) {
      setError(`Failed to fetch ${type} instances`);
    } finally {
      setModalLoading(false);
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id' },
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '状态', dataIndex: 'state', key: 'state' },
    { title: '开始时间', dataIndex: 'startTime', key: 'startTime' },
    { title: '结束时间', dataIndex: 'endTime', key: 'endTime' },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Link to={`/workflow/instances/${record.id}`}>查看详情</Link>
      ),
    },
  ];

  if (error) {
    return <Alert message="错误" description={error} type="error" showIcon />;
  }

  return (
    <div style={{ padding: '24px', background: '#f0f2f5' }}>
      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={16} align="middle">
          <Col>
            <Select
              style={{ width: 200 }}
              defaultValue={null}
              onChange={(value) => handleFilterChange({ projectCode: value })}
            >
              <Option value={null}>全部项目</Option>
              {projects.map(p => <Option key={p.code} value={p.code}>{p.name}</Option>)}
            </Select>
          </Col>
          <Col>
            <Button.Group>
              <Button onClick={() => handleTimeRangeChange('today')}>今日</Button>
              <Button onClick={() => handleTimeRangeChange('yesterday')}>昨日</Button>
            </Button.Group>
          </Col>
          <Col>
            <RangePicker
              value={filters.timeRange as any}
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                  handleFilterChange({ timeRange: [dates[0].startOf('day'), dates[1].endOf('day')] });
                } else {
                  handleFilterChange({ timeRange: dates });
                }
              }}
            />
          </Col>
          <Col>
            <Button type="primary" onClick={fetchDashboardData}>查询</Button>
          </Col>
        </Row>
      </Card>

      <Spin spinning={loading}>
        <Row gutter={[24, 24]}>
          <Col span={12}>
            <Card title="工作流实例概览">
              <Row>
                <Col span={6} style={{ cursor: 'pointer' }} onClick={() => handleStatusClick('workflow', 'success')}><Statistic title="成功" value={dashboardData.workflowStatusCount.success} valueStyle={{ color: '#3f8600' }} /></Col>
                <Col span={6} style={{ cursor: 'pointer' }} onClick={() => handleStatusClick('workflow', 'failure')}><Statistic title="失败" value={dashboardData.workflowStatusCount.failure} valueStyle={{ color: '#cf1322' }} /></Col>
                <Col span={6} style={{ cursor: 'pointer' }} onClick={() => handleStatusClick('workflow', 'running')}><Statistic title="执行中" value={dashboardData.workflowStatusCount.running} valueStyle={{ color: '#1890ff' }} /></Col>
                <Col span={6} style={{ cursor: 'pointer' }} onClick={() => handleStatusClick('workflow', 'waiting')}><Statistic title="等待" value={dashboardData.workflowStatusCount.waiting} valueStyle={{ color: '#d4b106' }} /></Col>
              </Row>
            </Card>
          </Col>
          <Col span={12}>
            <Card title="任务实例概览">
              <Row>
                <Col span={6} style={{ cursor: 'pointer' }} onClick={() => handleStatusClick('task', 'success')}><Statistic title="成功" value={dashboardData.taskStatusCount.success} valueStyle={{ color: '#3f8600' }} /></Col>
                <Col span={6} style={{ cursor: 'pointer' }} onClick={() => handleStatusClick('task', 'failure')}><Statistic title="失败" value={dashboardData.taskStatusCount.failure} valueStyle={{ color: '#cf1322' }} /></Col>
                <Col span={6} style={{ cursor: 'pointer' }} onClick={() => handleStatusClick('task', 'running')}><Statistic title="执行中" value={dashboardData.taskStatusCount.running} valueStyle={{ color: '#1890ff' }} /></Col>
                <Col span={6} style={{ cursor: 'pointer' }} onClick={() => handleStatusClick('task', 'waiting')}><Statistic title="等待" value={dashboardData.taskStatusCount.waiting} valueStyle={{ color: '#d4b106' }} /></Col>
              </Row>
            </Card>
          </Col>
        </Row>
      </Spin>

      <Modal
        title={modalTitle}
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width="80%"
      >
        <Spin spinning={modalLoading}>
          <Table dataSource={modalData} columns={columns} rowKey="id" />
        </Spin>
      </Modal>
    </div>
  );
};

export default DashboardPage;
