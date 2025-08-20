import { RootState } from "@/store";
import React, { useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import './index.less'
import { Button, Divider, message, Result, Table, TableColumnsType } from "antd";
import { setIsBackfillModalOpen, WorkflowDataType } from "@/store/slices/maintainSlice";
import { DashboardTwoTone } from "@ant-design/icons";
import { Link, useNavigate  } from 'react-router-dom';
import { get_chinese_workflow_instance_status } from "../../config";
import api from "@/api";
const WorkflowRunningView: React.FC = () => {
  const {
    selectedWorkflow,
    projects,
    processListWithTasks
  } = useSelector((state: RootState) => state.maintain);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const relativeTaskList = useMemo(() => {
    if (!processListWithTasks) return [];
    const processInstances = processListWithTasks.filter(pred => pred.processInstance.processDefinitionCode === selectedWorkflow?.processDefinitionCode).map(item => item.processInstance);
    return processInstances;
  }, [processListWithTasks, selectedWorkflow]);
  const handleRerunClick = useCallback(async (record: any) => {
    console.log(record);
    let executionType = 'REPEAT_RUNNING'
    let executionTypeZh = '重跑'
    switch (record.state) {
      case 1:
        executionType = 'STOP'
        executionTypeZh = '停止'
        break;
    
      default:
        break;
    }
    // GET /process/{projectCode}/{processInstanceId}/rerun
    const response: any = await api.get(`/api/ds/process/${record.projectCode}/${record.id}/${executionType}`);
    if (response.code === 0) {
      message.success(`发起${executionTypeZh}成功`);
    } else {
      message.error(response)
    }
  }, []);
  const columns: TableColumnsType<any> = useMemo(() => {
    return [
      {
        title: '工作流ID',
        dataIndex: 'id',
      },
      {
        title: '工作流名称',
        dataIndex: 'name',
      },
      {
        title: '项目名称',
        render: (_, item) =>
          projects.find(pred => pred.code == item.projectCode)?.name
      },
      {
        title: '状态', dataIndex: 'state', key: 'state',
        render: (_, record) => {
          return get_chinese_workflow_instance_status(_);
        }
       },
      {
        title: '操作',
        key: 'action',
        render: (_: any, record: any) => (
          <>
            <Link to={`/instances/${record.projectCode}/${record.id}`}>查看详情</Link>
            <Button danger={record.state === 1} type='primary' style={{ margin: '0 10px' }} onClick={() => handleRerunClick(record)}>{ record.state === 1 ? '停止': '重跑' }</Button>
          </>
          
        ),
    },
    ]
  }, [projects]);
  const handleCheckClick = useCallback(() => {
    console.log('user clicked check')
    navigate(`/workflow/edit/${selectedWorkflow?.id}`)
  }, [selectedWorkflow]);
  const handleExecuteClick = useCallback(() => {
    console.log('user clicked handleExecuteClick')
    dispatch(setIsBackfillModalOpen(true))
  }, []);
  if (!selectedWorkflow) return <div className="workflow-running-view-not-found">
    <Result
      status="404"
      title="404"
      subTitle="请选择一个工作流"
    />
  </div>
  return <div className="workflow-running-view">
    <div className="instances-panel">
      <div className="first-row">
        <div className="workflow-info">
          <div className="icon">
            <DashboardTwoTone />
          </div>
          <div>
            <div>工作流名称</div>
            <div>{selectedWorkflow?.yaml_content.workflow.name}</div>
          </div>
          <div>
            <div>项目名称</div>
            <div>{selectedWorkflow?.yaml_content.workflow.projectName || 'default'}</div>
          </div>
        </div>
        <div className="workflow-opertaion-panel">
          <div>
            <Button style={{ color: '#1677ff' }} onClick={handleCheckClick}>查看</Button>
          </div>
          <div>
            <Button type="primary" onClick={handleExecuteClick}>立即执行</Button>
          </div>
        </div>
      </div>
      <Divider>工作流详情</Divider>
      <div className="workflow-info-information">
        <div>
          <div>调度周期</div>
          <div>{ selectedWorkflow.yaml_content.workflow.schedule}</div>
        </div>
        <div>
          <div>任务流UUID</div>
          <div>{selectedWorkflow?.processDefinitionCode}</div>
        </div>
      </div>

    </div>
    <Divider>执行记录</Divider>
    <div>
      <Table<WorkflowDataType>
        columns={columns}
        dataSource={relativeTaskList}
        rowKey="id"
        pagination={
          {
            pageSize: 5
          }
        }
      />
    </div>
  </div>
}


export default WorkflowRunningView