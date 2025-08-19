import { RootState } from "@/store";
import React, { useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import './index.less'
import { Button, Divider, Result, Table, TableColumnsType } from "antd";
import { WorkflowDataType } from "@/store/slices/maintainSlice";
import { DashboardTwoTone } from "@ant-design/icons";
const WorkflowRunningView: React.FC = () => {
  const {
    selectedWorkflow,
    workflows,
    projects
  } = useSelector((state: RootState) => state.maintain);
  const dispatch = useDispatch();
  const columns: TableColumnsType<WorkflowDataType> = useMemo(() => {
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
        title: '操作'
      }
    ]
  }, []);
  const projectName = useMemo(() => {
    return projects.find(pred => pred.code === selectedWorkflow?.projectCode)?.name;
  }, [projects, selectedWorkflow]);
  const handleCheckClick = useCallback(() => {
    console.log('user clicked check')
    // call 
    // redirect to edit page 
  }, []);
  const handleExecuteClick = useCallback(() => {
    console.log('user clicked handleExecuteClick')
    // call 
    // redirect to edit page 
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
            <div>{selectedWorkflow?.name}</div>
          </div>
          <div>
            <div>项目名称</div>
            <div>{projectName}</div>
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
          <div>0 0 0 ? * * *</div>
        </div>
        <div>
          <div>任务流UUID</div>
          <div>{selectedWorkflow?.code}</div>
        </div>
      </div>

    </div>
    <Divider>执行记录</Divider>
    <div>
      <Table<WorkflowDataType>
        columns={columns}
        dataSource={workflows}
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