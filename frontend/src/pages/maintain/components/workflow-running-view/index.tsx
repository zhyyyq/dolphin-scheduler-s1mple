import { RootState } from "@/store";
import React, { useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import './index.less'
import { Table, TableColumnsType } from "antd";
import { WorkflowDataType } from "@/store/slices/maintainSlice";
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
  return <div className="workflow-running-view">
    <div className="instances-panel">
      <div className="first-row">
        <div className="workflow-info">
          <div className="icon">
            icon
          </div>
          <div>{selectedWorkflow?.workflowName}</div>
          <div>{selectedWorkflow?.projectName}</div>
        </div>
        <div className="workflow-opertaion-panel">
          <div>刷新</div>
          <div>查看</div>
          <div>执行</div>
        </div>
      </div>

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
    <div>执行记录</div>
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