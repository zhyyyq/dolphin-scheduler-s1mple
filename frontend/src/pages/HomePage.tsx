import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Table, Spin, Alert, Typography, Tag, Button, Space, Tooltip,
  App as AntApp
} from 'antd';
import { Link, useLocation } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { Graph, Node as X6Node } from '@antv/x6';
import { Workflow, WorkflowDetail, Task } from '../types';
import api from '../api';
import yaml from 'yaml';
import RestoreWorkflowModal from '../components/RestoreWorkflowModal';
import BackfillModal from '../components/BackfillModal';
import { compileGraph } from '../utils/graphUtils';
import '../components/TaskNode'; // Register custom node

const { Title } = Typography;

interface Parameter {
  name: string;
  type: string;
  value: any;
}

interface ActionButtonsProps {
  record: Workflow;
  onDelete: (record: Workflow) => void;
  onSubmit: (record: Workflow) => void;
  onExecute: (record: Workflow) => void;
  onOnline: (record: Workflow) => void;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({ record, onDelete, onSubmit, onExecute, onOnline }) => {
  const workflowUuid = record.uuid;

  return (
    <Space size="middle">
      {record.releaseState === 'MODIFIED' ? (
        <Button type="primary" onClick={() => onOnline(record)}>同步</Button>
      ) : record.releaseState === 'ONLINE' ? (
        <Button type="primary" onClick={() => onExecute(record)}>立即执行</Button>
      ) : null}
      
      {record.releaseState === 'UNSUBMITTED' && (
        <Button type="primary" onClick={() => onSubmit(record)}>提交</Button>
      )}
      {record.releaseState === 'OFFLINE' && (
        <Button type="primary" onClick={() => onOnline(record)}>上线</Button>
      )}
      <Link to={`/workflow/edit/${workflowUuid}`}>编辑</Link>
      <Link to={`/workflow/${workflowUuid}/history`}>历史</Link>
      <Button type="link" danger onClick={() => onDelete(record)}>删除</Button>
    </Space>
  );
};

const HomePage: React.FC = () => {
  const { message } = AntApp.useApp();
  const location = useLocation();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [isBackfillModalOpen, setIsBackfillModalOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);

  const fetchWorkflows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const combinedWorkflows = await api.get<Workflow[]>('/api/workflow/combined');
      setWorkflows(combinedWorkflows);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows, location]);

  const handleDelete = useCallback(async (record: Workflow) => {
    try {
      const params: { projectCode?: number; workflowCode?: number } = {};
      if (record.projectCode && typeof record.code === 'number') {
        params.projectCode = record.projectCode;
        params.workflowCode = record.code;
      }

      await api.delete(`/api/workflow/${record.uuid}`, params);
      message.success('工作流删除成功。');
      fetchWorkflows();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      message.error(errorMessage);
    }
  }, [fetchWorkflows, message]);

  const handleExecute = useCallback((record: Workflow) => {
    setSelectedWorkflow(record);
    setIsBackfillModalOpen(true);
  }, []);

  const handleOnline = useCallback(async (record: Workflow) => {
    try {
      // 1. Fetch the full YAML content and workflow details
      const workflowDetail = await api.get<WorkflowDetail>(`/api/workflow/${record.uuid}`);
      const yamlContent = workflowDetail.yaml_content;
      const doc = yaml.parse(yamlContent);
      const workflow = doc.workflow || {};
      
      // Create a temporary graph instance to compile the workflow
      const tempGraph = new Graph({ container: document.createElement('div') });
      const originalTasks = doc.tasks || [];
      const relations: { from: string, to: string }[] = [];
      for (const task of originalTasks) {
        if (task.deps) {
          for (const dep of task.deps) {
            relations.push({ from: dep, to: task.name });
          }
        }
      }
      const nodes = originalTasks.map((task: any) => tempGraph.createNode({ shape: 'task-node', id: task.name, data: task }));
      const edges = relations.map(rel => {
        const sourceNode = nodes.find((n: X6Node) => n.getData().name === rel.from);
        const targetNode = nodes.find((n: X6Node) => n.getData().name === rel.to);
        if (sourceNode && targetNode) {
          return tempGraph.createEdge({ source: sourceNode.id, target: targetNode.id });
        }
        return null;
      }).filter(Boolean);
      
      tempGraph.resetCells([...nodes, ...edges as any]);

      // 2. COMPILE the graph
      const { tasks, taskRelations } = compileGraph(tempGraph);

      // 3. Generate task codes
      const taskNameToCodeMap = new Map<string, number>();
      const baseCode = Date.now();
      tasks.forEach((task: Task, index: number) => {
        const taskCode = baseCode + index;
        taskNameToCodeMap.set(task.name, taskCode);
      });

      // 4. Build taskDefinitionJson from the COMPILED tasks
      const taskDefinitionJson = tasks.map((task: Task) => {
        const taskCode = taskNameToCodeMap.get(task.name);
        
        let taskParams: Record<string, any>;
        let taskType = (task.type || 'SHELL').toUpperCase();

        if (task.type === 'SQL') {
          const params = task.task_params || {};
          taskParams = {
            type: params.datasourceType,
            datasource: params.datasource,
            sql: params.sql,
            sqlType: params.sqlType,
            preStatements: params.preStatements ? (params.preStatements as string).split(';').filter((s: string) => s.trim() !== '') : [],
            postStatements: params.postStatements ? (params.postStatements as string).split(';').filter((s: string) => s.trim() !== '') : [],
            displayRows: params.displayRows,
            localParams: params.localParams || [],
            resourceList: [],
          };
        } else if (task.type === 'SWITCH') {
          const params = task.task_params || {};
          const dependTaskList = (params.dependTaskList || []).map((item: any) => ({
            ...item,
            nextNode: taskNameToCodeMap.get(item.nextNode),
          }));
          taskParams = {
            localParams: params.localParams || [],
            switchResult: JSON.stringify({
              dependTaskList: dependTaskList,
            }),
            rawScript: '',
          };
        } else if (task.type === 'HTTP') {
          taskParams = {
            ...task.task_params,
          };
        } else if (task.type === 'CONDITIONS') {
          const params = task.task_params || {};
          const successNode = (params.dependence?.dependTaskList?.[0]?.conditionResult?.successNode || []).map((name: string) => taskNameToCodeMap.get(name));
          const failedNode = (params.dependence?.dependTaskList?.[0]?.conditionResult?.failedNode || []).map((name: string) => taskNameToCodeMap.get(name));

          taskParams = {
            localParams: params.localParams || [],
            dependence: {
              relation: "AND",
              dependTaskList: []
            },
            conditionResult: {
              successNode: successNode,
              failedNode: failedNode
            },
          };
        } else if (task.type === 'DEPENDENT') {
            const params = task.task_params || {};
            taskParams = {
                dependence: params.denpendence, // Correctly pass the object
                localParams: [],
                resourceList: [],
            };
        } else {
          const rawScript = task.command || '';
          const localParams = task.localParams || [];
          taskParams = {
            rawScript: rawScript,
            localParams: localParams,
            resourceList: [],
          };
        }

        return {
          code: taskCode,
          name: task.name,
          description: task.description || '',
          taskType: taskType,
          taskParams: taskParams,
          failRetryTimes: 0,
          failRetryInterval: 1,
          timeoutFlag: 'CLOSE',
          timeoutNotifyStrategy: '',
          timeout: 0,
          delayTime: 0,
          environmentCode: -1,
          flag: 'YES',
          isCache: 'NO',
          taskPriority: 'MEDIUM',
          workerGroup: 'default',
          cpuQuota: -1,
          memoryMax: -1,
          taskExecuteType: 'BATCH'
        };
      });

      // 5. Build taskRelationJson and locations from COMPILED relations
      const taskRelationJson: any[] = [];
      const originalLocations = workflowDetail.locations ? JSON.parse(workflowDetail.locations) : [];
      const originalLocationsMap = new Map(originalLocations.map((l: any) => [l.taskCode, { x: l.x, y: l.y }]));
      const payloadLocations: any[] = [];

      tasks.forEach((task: Task, i: number) => {
        const numericTaskCode = taskNameToCodeMap.get(task.name);
        const pos = originalLocationsMap.get(task.name);
        const x = pos ? (pos as any).x : 150 + i * 200;
        const y = pos ? (pos as any).y : 150;
        if (numericTaskCode) {
          payloadLocations.push({ taskCode: numericTaskCode, x, y });
        }
      });

      tasks.forEach((task: Task) => {
        const postTaskCode = taskNameToCodeMap.get(task.name);
        if (!postTaskCode) return;

        if (task.deps) {
          task.deps.forEach((depName: string) => {
            const preTaskCode = taskNameToCodeMap.get(depName);
            if (preTaskCode) {
              const depTask = tasks.find(t => t.name === depName);
              if (!depTask || depTask.type !== 'CONDITIONS') {
                taskRelationJson.push({
                  name: '',
                  preTaskCode: preTaskCode,
                  preTaskVersion: 0,
                  postTaskCode: postTaskCode,
                  postTaskVersion: 0,
                  conditionType: 'NONE',
                  conditionParams: {}
                });
              }
            }
          });
        }

        if (task.type === 'CONDITIONS') {
          const preTaskCode = taskNameToCodeMap.get(task.name);
          if (!preTaskCode) return;

          const successNodes = task.task_params?.dependence?.dependTaskList?.[0]?.conditionResult?.successNode || [];
          for (const nodeName of successNodes) {
            const postTaskCode = taskNameToCodeMap.get(nodeName);
            if (postTaskCode) {
              taskRelationJson.push({
                name: '',
                preTaskCode: preTaskCode,
                preTaskVersion: 0,
                postTaskCode: postTaskCode,
                postTaskVersion: 0,
                conditionType: 'SUCCESS',
                conditionParams: {}
              });
            }
          }

          const failedNodes = task.task_params?.dependence?.dependTaskList?.[0]?.conditionResult?.failedNode || [];
          for (const nodeName of failedNodes) {
            const postTaskCode = taskNameToCodeMap.get(nodeName);
            if (postTaskCode) {
              taskRelationJson.push({
                name: '',
                preTaskCode: preTaskCode,
                preTaskVersion: 0,
                postTaskCode: postTaskCode,
                postTaskVersion: 0,
                conditionType: 'FAILURE',
                conditionParams: {}
              });
            }
          }
        }
      });

      const targetNodes = new Set(taskRelationJson.map(r => r.postTaskCode));
      const rootTasks = tasks.filter(t => !targetNodes.has(t.name));
      for (const rootTask of rootTasks) {
        const numericTaskCode = taskNameToCodeMap.get(rootTask.name);
        if (numericTaskCode && !taskRelationJson.some(r => r.postTaskCode === numericTaskCode)) {
          taskRelationJson.push({
            name: '',
            preTaskCode: 0,
            preTaskVersion: 0,
            postTaskCode: numericTaskCode,
            postTaskVersion: 0,
            conditionType: 'NONE',
            conditionParams: {}
          });
        }
      }
      
      // 6. Assemble payload
      const payload = {
        uuid: record.uuid,
        name: workflow.name || record.name,
        project: workflow.project || 'default',
        description: workflow.description || '',
        globalParams: '[]',
        timeout: workflow.timeout || 0,
        executionType: workflow.executionType || 'PARALLEL',
        taskDefinitionJson: JSON.stringify(taskDefinitionJson),
        taskRelationJson: JSON.stringify(taskRelationJson),
        locations: JSON.stringify(payloadLocations),
        isNew: record.releaseState === 'UNSUBMITTED',
        schedule: undefined as any,
      };

      if (workflow.schedule) {
        payload.schedule = {
          startTime: new Date().toISOString().slice(0, 19).replace('T', ' '),
          endTime: '2125-07-25 00:00:00',
          crontab: workflow.schedule,
          timezoneId: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
      }

      await api.createOrUpdateDsWorkflow(payload);

      message.success('工作流上线/同步成功。');
      fetchWorkflows();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      message.error(`上线工作流时出错: ${errorMessage}`);
    }
  }, [fetchWorkflows, message]);

  const handleSubmit = useCallback((record: Workflow) => {
    handleOnline(record);
  }, [handleOnline]);

  const columns: ColumnsType<Workflow> = useMemo(() => [
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
      render: (_, record) => <ActionButtons record={record} onDelete={handleDelete} onSubmit={handleSubmit} onExecute={handleExecute} onOnline={handleOnline} />,
    },
  ], [handleDelete, handleSubmit, handleExecute, handleOnline]);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><Spin size="large" /></div>;
  }

  if (error) {
    return <Alert message="错误" description={error} type="error" showIcon />;
  }

  return (
    <div style={{ padding: '24px', background: '#fff', borderRadius: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Title level={2} style={{ margin: 0 }}>所有工作流</Title>
        <Space>
          <Button onClick={() => setIsRestoreModalOpen(true)}>恢复工作流</Button>
          <Link to="/workflow/edit">
            <Button type="primary">新建工作流</Button>
          </Link>
        </Space>
      </div>
      <Table 
        columns={columns} 
        dataSource={workflows} 
        rowKey="uuid" 
        bordered
      />
      <RestoreWorkflowModal
        open={isRestoreModalOpen}
        onCancel={() => setIsRestoreModalOpen(false)}
        onRestored={() => {
          setIsRestoreModalOpen(false);
          fetchWorkflows();
        }}
      />
      <BackfillModal
        open={isBackfillModalOpen}
        workflow={selectedWorkflow}
        onCancel={() => setIsBackfillModalOpen(false)}
        onSuccess={() => {
          setIsBackfillModalOpen(false);
          fetchWorkflows();
        }}
      />
    </div>
  );
};

export default HomePage;
