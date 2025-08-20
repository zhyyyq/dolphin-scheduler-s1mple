import React, { useMemo } from "react";
import './index.less'
import { Table, TableColumnsType } from 'antd';
import { fetchWorkflowDetail, WorkflowDataType } from "@/store/slices/maintainSlice";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store";

const WorkflowList: React.FC = () => {
  const {
    workflows, projects, selectedTaskType, processListWithTasks
  } = useSelector((state: RootState) => state.maintain);
  const dispatch: AppDispatch = useDispatch();
  const columns: TableColumnsType<WorkflowDataType> = useMemo(() => {
    return [
      {
        title: '工作流ID',
        dataIndex: 'id',
        render: (text, record) => <a onClick={() => { dispatch(fetchWorkflowDetail(record.code)) }}>{text}</a>,
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
    ]
  }, [projects]);
  const workflowsFilteredByStatusType = useMemo(() => {
    if (selectedTaskType == -1 || !selectedTaskType) {
      return workflows;
    }
    // get instance
    const processDefinitionCodeList = new Set(processListWithTasks.map(item => item.processInstance).filter(item => item.state === selectedTaskType).map(item => item.processDefinitionCode));
    return workflows.filter(item => processDefinitionCodeList.has(item.code));
  }, [workflows,selectedTaskType, processListWithTasks]);
  return (
    <div className="workflows-list">
      <Table<WorkflowDataType>
        rowKey="id"
        columns={columns}
        dataSource={workflowsFilteredByStatusType}
        pagination={
          {
            pageSize: 5
          }
        }
      />
    </div>
  )
}


export default WorkflowList