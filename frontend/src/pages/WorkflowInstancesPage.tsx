import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Table, Spin, Alert, Typography, Tag, Select, Input, Button, Form, Row, Col } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { WorkflowInstance } from '../types';
import api from '../api';

const { Title } = Typography;
const { Option } = Select;

const STATE_MAP: { [key: string]: string } = {
  SUBMIT_SUCCESS: '提交成功',
  RUNNING_EXECUTION: '运行中',
  READY_PAUSE: '准备暂停',
  PAUSE: '暂停',
  READY_STOP: '准备停止',
  STOP: '停止',
  FAILURE: '失败',
  SUCCESS: '成功',
  DELAY_EXECUTION: '延迟执行',
  SERIAL_WAIT: '串行等待',
  READY_BLOCK: '准备阻塞',
  BLOCK: '阻塞',
  WAIT_TO_RUN: '等待运行',
};

const WorkflowInstancesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [instances, setInstances] = useState<WorkflowInstance[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [projects, setProjects] = useState<{ label: string; value: number }[]>([]);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);

  const [form] = Form.useForm();

  const fetchProjects = useCallback(async () => {
    try {
      const data = await api.get<any[]>('/api/ds/projects');
      const projectOptions = data.map(p => ({ label: p.name, value: p.code }));
      setProjects(projectOptions);
      if (projectOptions.length > 0) {
        const initialProject = Number(searchParams.get('projectCode')) || projectOptions[0].value;
        setSelectedProject(initialProject);
        form.setFieldsValue({ projectCode: initialProject });
      }
    } catch (err) {
      setError('无法加载项目列表');
    }
  }, [searchParams, form]);

  const fetchInstances = useCallback(async (projectCode: number, currentPage: number, currentSize: number, state?: string, workflowName?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {
        pageNo: currentPage,
        pageSize: currentSize,
      };
      if (state) {
        params.stateType = state;
      }
      if (workflowName) {
        params.processInstanceName = workflowName;
      }
      const data = await api.get<any>(`/api/ds/projects/${projectCode}/instances`, params);
      setInstances(data.totalList);
      setTotal(data.total);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (selectedProject) {
      const state = searchParams.get('state') || undefined;
      const workflowName = searchParams.get('workflowName') || undefined;
      form.setFieldsValue({ state, workflowName });
      fetchInstances(selectedProject, page, pageSize, state, workflowName);
    }
  }, [selectedProject, page, pageSize, fetchInstances]);

  const handleTableChange = (pagination: any) => {
    setPage(pagination.current);
    setPageSize(pagination.pageSize);
  };

  const handleFilter = (values: { projectCode: number; state?: string; workflowName?: string }) => {
    const newPage = 1;
    setPage(newPage);
    setSelectedProject(values.projectCode);
    
    const params: any = { projectCode: values.projectCode.toString() };
    if (values.state) {
      params.state = values.state;
    } else {
      searchParams.delete('state');
    }
    if (values.workflowName) {
      params.workflowName = values.workflowName;
    } else {
      searchParams.delete('workflowName');
    }
    setSearchParams(params);

    fetchInstances(values.projectCode, newPage, pageSize, values.state, values.workflowName);
  };

  const columns: ColumnsType<WorkflowInstance> = useMemo(() => [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: WorkflowInstance) => {
        if (record.processDefinition) {
          return <Link to={`/instances/${record.processDefinition.projectCode}/${record.id}`}>{text}</Link>;
        }
        return text;
      },
    },
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
    { title: '运行时长', dataIndex: 'duration', key: 'duration' },
  ], []);

  if (error) {
    return <Alert message="错误" description={error} type="error" showIcon />;
  }

  return (
    <div style={{ padding: '24px', background: '#fff', borderRadius: '8px' }}>
      <Title level={2} style={{ marginBottom: '24px' }}>工作流实例</Title>
      <Form
        form={form}
        onFinish={handleFilter}
        layout="inline"
        style={{ marginBottom: '24px' }}
        initialValues={{
          projectCode: selectedProject,
          state: searchParams.get('state') || undefined,
          workflowName: searchParams.get('workflowName') || '',
        }}
      >
        <Row gutter={16} style={{ width: '100%' }}>
          <Col>
            <Form.Item name="projectCode" label="项目">
              <Select style={{ width: 200 }} onChange={setSelectedProject} loading={projects.length === 0}>
                {projects.map(p => <Option key={p.value} value={p.value}>{p.label}</Option>)}
              </Select>
            </Form.Item>
          </Col>
          <Col>
            <Form.Item name="state" label="状态">
              <Select style={{ width: 150 }} allowClear>
                <Option value="SUBMIT_SUCCESS">提交成功</Option>
                <Option value="RUNNING_EXECUTION">运行中</Option>
                <Option value="READY_PAUSE">准备暂停</Option>
                <Option value="PAUSE">暂停</Option>
                <Option value="READY_STOP">准备停止</Option>
                <Option value="STOP">停止</Option>
                <Option value="FAILURE">失败</Option>
                <Option value="SUCCESS">成功</Option>
                <Option value="DELAY_EXECUTION">延迟执行</Option>
                <Option value="SERIAL_WAIT">串行等待</Option>
                <Option value="READY_BLOCK">准备阻塞</Option>
                <Option value="BLOCK">阻塞</Option>
                <Option value="WAIT_TO_RUN">等待运行</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col>
            <Form.Item name="workflowName" label="工作流名称">
              <Input placeholder="输入工作流名称" />
            </Form.Item>
          </Col>
          <Col>
            <Form.Item>
              <Button type="primary" htmlType="submit">查询</Button>
            </Form.Item>
          </Col>
        </Row>
      </Form>
      <Spin spinning={loading}>
        <Table
          columns={columns}
          dataSource={instances}
          rowKey="id"
          bordered
          pagination={{
            current: page,
            pageSize: pageSize,
            total: total,
          }}
          onChange={handleTableChange}
        />
      </Spin>
    </div>
  );
};

export default WorkflowInstancesPage;
