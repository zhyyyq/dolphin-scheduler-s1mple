import React, { useMemo } from "react";
import './index.less'
import { Table, TableColumnsType } from 'antd';
import { setSelectedWorkflow, WorkflowDataType } from "@/store/slices/maintainSlice";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store";

const WorkflowList: React.FC = () => {
  const {
    workflows, projects
  } = useSelector((state: RootState) => state.maintain);
  const dispatch = useDispatch();
  const columns: TableColumnsType<WorkflowDataType> = useMemo(() => {
    return [
      {
        title: '工作流ID',
        dataIndex: 'id',
        render: (text, record) => <a onClick={() => { dispatch(setSelectedWorkflow(record)) }}>{text}</a>,
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
  return (
    <div className="workflows-list">
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
  )
}


export default WorkflowList