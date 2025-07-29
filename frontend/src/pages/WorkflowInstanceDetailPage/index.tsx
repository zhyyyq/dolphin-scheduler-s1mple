import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Spin, Alert, Typography, Row, Col, Card, Descriptions, Tag, Modal, Button, Table } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, SyncOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import InstanceDagGraph from './components/InstanceDagGraph';
import api from '@/api';
import './index.less';

const { Title } = Typography;

const STATE_MAP: { [key: string]: { text: string; color: string; icon: React.ReactNode } } = {
  SUCCESS: { text: '成功', color: 'success', icon: <CheckCircleOutlined /> },
  FAILURE: { text: '失败', color: 'error', icon: <CloseCircleOutlined /> },
  RUNNING_EXECUTION: { text: '运行中', color: 'processing', icon: <SyncOutlined spin /> },
  STOP: { text: '停止', color: 'warning', icon: <QuestionCircleOutlined /> },
  KILL: { text: '终止', color: 'error', icon: <CloseCircleOutlined /> },
  SUBMIT_SUCCESS: { text: '提交成功', color: 'default', icon: <QuestionCircleOutlined /> },
  READY_PAUSE: { text: '准备暂停', color: 'warning', icon: <QuestionCircleOutlined /> },
  PAUSE: { text: '暂停', color: 'warning', icon: <QuestionCircleOutlined /> },
  READY_STOP: { text: '准备停止', color: 'warning', icon: <QuestionCircleOutlined /> },
  DELAY_EXECUTION: { text: '延迟执行', color: 'default', icon: <QuestionCircleOutlined /> },
  SERIAL_WAIT: { text: '串行等待', color: 'default', icon: <QuestionCircleOutlined /> },
  READY_BLOCK: { text: '准备阻塞', color: 'default', icon: <QuestionCircleOutlined /> },
  BLOCK: { text: '阻塞', color: 'default', icon: <QuestionCircleOutlined /> },
  WAIT_TO_RUN: { text: '等待运行', color: 'default', icon: <QuestionCircleOutlined /> },
};

const WorkflowInstanceDetailPage: React.FC = () => {
  const { projectCode, instanceId } = useParams<{ projectCode: string; instanceId: string }>();
  const [instance, setInstance] = useState<any>(null);
  const [workflowUuid, setWorkflowUuid] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [logVisible, setLogVisible] = useState<boolean>(false);
  const [logContent, setLogContent] = useState<string>('');
  const [logLoading, setLogLoading] = useState<boolean>(false);

  const fetchInstanceDetail = useCallback(async () => {
    if (!projectCode || !instanceId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<any>(`/api/ds/projects/${projectCode}/instances/${instanceId}`);
      setInstance(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [projectCode, instanceId]);

  useEffect(() => {
    fetchInstanceDetail();
  }, [fetchInstanceDetail]);

  useEffect(() => {
    const findWorkflowUuid = async () => {
      if (instance && instance.dagData && instance.dagData.processDefinition) {
        try {
          const workflows = await api.get<any[]>('/api/workflow/combined');
          const processDefinitionCode = instance.dagData.processDefinition.code;
          const matchedWorkflow = workflows.find(wf => String(wf.code) === String(processDefinitionCode));
          if (matchedWorkflow) {
            setWorkflowUuid(matchedWorkflow.uuid);
          }
        } catch (err) {
          console.error('Failed to fetch combined workflows', err);
        }
      }
    };
    findWorkflowUuid();
  }, [instance]);

  const showLog = useCallback(async (taskInstanceId: number) => {
    setLogVisible(true);
    setLogLoading(true);
    try {
      const logData = await api.get<string>(`/api/ds/log/${taskInstanceId}`);
      const formattedLog = logData.replace(/\\r\\n/g, '\n');
      setLogContent(formattedLog);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setLogContent(`无法加载日志: ${errorMessage}`);
    } finally {
      setLogLoading(false);
    }
  }, []);

  const handleNodeClick = useCallback((node: any) => {
    showLog(node.id);
  }, [showLog]);

  const graphData = useMemo(() => {
    if (!instance || !instance.dagData || !instance.dagData.processDefinition) {
      return { nodes: [], edges: [] };
    }
    const nodes = instance.tasks.map((task: any) => ({
      id: task.taskCode.toString(),
      label: task.name,
      data: task,
      style: {
        fill: task.state === 'SUCCESS' ? '#f6ffed' : task.state === 'FAILURE' ? '#fff1f0' : '#e6f7ff',
        stroke: task.state === 'SUCCESS' ? '#52c41a' : task.state === 'FAILURE' ? '#f5222d' : '#1890ff',
      },
    }));
    const relations = instance.dagData.processTaskRelationList || [];
    const edges = relations
      .filter((rel: any) => rel.preTaskCode && rel.postTaskCode)
      .map((rel: any) => ({
        source: rel.preTaskCode.toString(),
        target: rel.postTaskCode.toString(),
      }));
    return { nodes, edges };
  }, [instance]);

  const taskColumns = [
    { title: '任务名称', dataIndex: 'name', key: 'name' },
    {
      title: '状态',
      dataIndex: 'state',
      key: 'state',
      render: (state: string) => {
        const stateInfo = STATE_MAP[state] || { text: state, color: 'default', icon: <QuestionCircleOutlined /> };
        return <Tag color={stateInfo.color} icon={stateInfo.icon}>{stateInfo.text}</Tag>;
      },
    },
    { title: '开始时间', dataIndex: 'startTime', key: 'startTime' },
    { title: '结束时间', dataIndex: 'endTime', key: 'endTime' },
    { title: '运行时长', dataIndex: 'duration', key: 'duration' },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Button type="link" onClick={() => showLog(record.id)}>查看日志</Button>
      ),
    },
  ];

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><Spin size="large" /></div>;
  }

  if (error) {
    return <Alert message="错误" description={error} type="error" showIcon />;
  }

  if (!instance) {
    return <Alert message="无数据" description="无法加载工作流实例详情。" type="info" showIcon />;
  }

  const stateInfo = STATE_MAP[instance.state] || { text: instance.state, color: 'default', icon: <QuestionCircleOutlined /> };

  return (
    <div style={{ padding: '24px', background: '#f0f2f5' }}>
      <Title level={2}>{instance.name}</Title>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="状态">
                <Tag color={stateInfo.color} icon={stateInfo.icon}>{stateInfo.text}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="开始时间">{instance.startTime}</Descriptions.Item>
              <Descriptions.Item label="结束时间">{instance.endTime}</Descriptions.Item>
              <Descriptions.Item label="运行时长">{instance.duration}</Descriptions.Item>
              <Descriptions.Item label="工作流定义">
                {instance.dagData && instance.dagData.processDefinition ? (
                  workflowUuid ? (
                    <Link to={`/workflow/edit/${workflowUuid}`}>{instance.dagData.processDefinition.name}</Link>
                  ) : (
                    <span>{instance.dagData.processDefinition.name}</span>
                  )
                ) : (
                  'N/A'
                )}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="任务图" style={{ height: '500px'}} className='instance-dag-graph'>
            <InstanceDagGraph nodes={graphData.nodes} edges={graphData.edges} onNodeClick={handleNodeClick} />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="任务列表" style={{ height: '500px', overflow: 'auto' }}>
            <Table
              columns={taskColumns}
              dataSource={instance.tasks}
              rowKey="id"
              size="small"
              pagination={false}
            />
          </Card>
        </Col>
      </Row>
      <Modal
        title="查看日志"
        visible={logVisible}
        onCancel={() => setLogVisible(false)}
        footer={[
          <Button key="back" onClick={() => setLogVisible(false)}>
            关闭
          </Button>,
        ]}
        width="80%"
      >
        <Spin spinning={logLoading}>
          <pre style={{ background: '#f5f5f5', padding: '10px', maxHeight: '60vh', overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            <code>{logContent}</code>
          </pre>
        </Spin>
      </Modal>
    </div>
  );
};

export default WorkflowInstanceDetailPage;
