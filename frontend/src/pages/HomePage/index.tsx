import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Table, Spin, Alert, Typography, Tag, Button, Space, Tooltip,
  App as AntApp,
  Select,
  Divider,
} from 'antd';
import { Link, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { ColumnsType } from 'antd/es/table';
import { Graph, Node as X6Node } from '@antv/x6';
import { Workflow, WorkflowDetail, Task } from '../../types';
import { RootState, AppDispatch } from '../../store';
import {
  fetchWorkflows,
  setSelectedProject,
  setIsRestoreModalOpen,
  setIsBackfillModalOpen,
  setSelectedWorkflow,
  deleteWorkflow,
  onlineWorkflow,
} from '../../store/slices/homeSlice';
import api from '../../api';
import yaml from 'yaml';
import RestoreWorkflowModal from '../../components/RestoreWorkflowModal';
import BackfillModal from '../../components/BackfillModal';
import CreateProjectModal from './components/CreateProjectModal';
import { compileGraph } from '../../utils/graphUtils';
import '../../components/TaskNode'; // Register custom node
import { ActionButtons } from './components/ActionButtons';

const { Title } = Typography;



const HomePage: React.FC = () => {
  const { message } = AntApp.useApp();
  const location = useLocation();
  const dispatch: AppDispatch = useDispatch();
  const {
    workflows,
    loading,
    error,
    projects,
    selectedProject,
    isRestoreModalOpen,
    isBackfillModalOpen,
    selectedWorkflow,
  } = useSelector((state: RootState) => state.home);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchWorkflows());
  }, [dispatch, location]);


  const columns: ColumnsType<Workflow> = useMemo(() => [
    {
      title: '项目',
      dataIndex: 'projectName',
      key: 'projectName',
    },
    {
      title: '工作流名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '定时设置',
      dataIndex: 'schedule_human_readable',
      key: 'schedule_human_readable',
      render: (text: string, record: Workflow) => (
        <Tooltip title={record.schedule_text}>
          <span>{text || '-'}</span>
        </Tooltip>
      ),
    },
    {
      title: '状态',
      dataIndex: 'releaseState',
      key: 'releaseState',
      render: (state: Workflow['releaseState'], record: Workflow) => {
        if (state === 'MODIFIED') {
          return <Tag color="processing">待同步</Tag>;
        }

        let color = 'default';
        let text = state;
        if (state === 'ONLINE') {
          color = 'green';
          text = '在线' as any;
        } else if (state === 'OFFLINE') {
          color = 'volcano';
          text = '离线' as any;
        } else if (state === 'UNSUBMITTED') {
          color = 'gold';
          text = '待提交' as any;
        }
        return <Tag color={color} key={state}>{text}</Tag>;
      },
    },
    {
      title: '最后更新时间',
      dataIndex: 'updateTime',
      key: 'updateTime',
      render: (time: string | number) => {
        if (typeof time === 'number') {
          return new Date(time * 1000).toLocaleString();
        }
        return new Date(time).toLocaleString();
      },
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record: Workflow) => <ActionButtons record={record} />,
    },
  ], []);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><Spin size="large" /></div>;
  }

  if (error) {
    return <Alert message="错误" description={error} type="error" showIcon />;
  }

  const filteredWorkflows = selectedProject && selectedProject !== 'all'
    ? workflows.filter(w => w.projectName === selectedProject)
    : workflows;

  return (
    <div style={{ padding: '24px', background: '#fff', borderRadius: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Title level={2} style={{ margin: 0 }}>所有工作流</Title>
        <Space>
          <Select
            placeholder="选择项目"
            style={{ width: 200 }}
            onChange={(value) => {
              if (value === 'create_new_project') {
                setIsCreateProjectModalOpen(true);
              } else {
                dispatch(setSelectedProject(value));
              }
            }}
            value={selectedProject || 'all'}
            dropdownRender={(menu) => (
              <>
                {menu}
                <Divider style={{ margin: '8px 0' }} />
                <Button type="link" onClick={() => setIsCreateProjectModalOpen(true)} style={{ width: '100%' }}>
                  新建项目
                </Button>
              </>
            )}
          >
            <Select.Option value="all">所有项目</Select.Option>
            {projects.map(p => <Select.Option key={p} value={p}>{p}</Select.Option>)}
          </Select>
          <Button onClick={() => dispatch(setIsRestoreModalOpen(true))}>恢复工作流</Button>
          <Link to="/workflow/edit">
            <Button type="primary">新建工作流</Button>
          </Link>
        </Space>
      </div>
      <Table 
        columns={columns} 
        dataSource={filteredWorkflows} 
        rowKey="uuid" 
        bordered
      />
      <RestoreWorkflowModal
        open={isRestoreModalOpen}
        onCancel={() => dispatch(setIsRestoreModalOpen(false))}
        onRestored={() => {
          dispatch(setIsRestoreModalOpen(false));
          dispatch(fetchWorkflows());
        }}
      />
      <BackfillModal
        open={isBackfillModalOpen}
        workflow={selectedWorkflow}
        onCancel={() => dispatch(setIsBackfillModalOpen(false))}
        onSuccess={() => {
          dispatch(setIsBackfillModalOpen(false));
          dispatch(fetchWorkflows());
        }}
      />
      <CreateProjectModal
        open={isCreateProjectModalOpen}
        onCancel={() => setIsCreateProjectModalOpen(false)}
        onSuccess={() => {
          setIsCreateProjectModalOpen(false);
          dispatch(fetchWorkflows());
        }}
      />
    </div>
  );
};

export default HomePage;
