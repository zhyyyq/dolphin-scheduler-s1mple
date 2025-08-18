import { RootState } from "@/store";
import React, { useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import './index.less'
import { Button, Divider, Result, Table, TableColumnsType } from "antd";
import { WorkflowDataType } from "@/store/slices/maintainSlice";
import { DashboardTwoTone, PlayCircleTwoTone, QuestionCircleTwoTone, RedoOutlined } from "@ant-design/icons";
const WorkflowRunningView: React.FC = () => {
  const {
    selectedWorkflow,
    workflows
  } = useSelector((state: RootState) => state.maintain);
  const dispatch = useDispatch();
  const columns: TableColumnsType<WorkflowDataType> = useMemo(() => {
    return [
      {
        title: '工作流ID',
        dataIndex: 'workflowId',
      },
      {
        title: '工作流名称',
        dataIndex: 'workflowName',
      },
      {
        title: '项目名称',
        dataIndex: 'projectName',
      },
      {
        title: '操作'
      }
    ]
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
            <div>{selectedWorkflow?.workflowName}</div>
          </div>
          <div>
            <div>项目名称</div>
            <div>{selectedWorkflow?.projectName}</div>
          </div>
        </div>
        <div className="workflow-opertaion-panel">
          <div>
            <RedoOutlined style={{ color: '#1677ff'}}></RedoOutlined>
          </div>
          <div>
            <QuestionCircleTwoTone />
          </div>
          <div>
            <PlayCircleTwoTone/>
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
          <div>发布状态</div>
          <div>已发布</div>
        </div>
        <div>
          <div>任务流UUID</div>
          <div>{selectedWorkflow?.workflowId}</div>
        </div>
      </div>

    </div>
    <Divider>执行记录</Divider>
    <div>
      <Table<WorkflowDataType>
        columns={columns}
        dataSource={workflows}
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