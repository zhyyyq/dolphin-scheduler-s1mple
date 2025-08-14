import React, { useMemo } from "react";
import './index.less'
import { Table, Input, TableColumnsType } from 'antd';
import { setSelectedWorkflow, WorkflowDataType } from "@/store/slices/maintainSlice";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store";








const WorkflowList: React.FC = () => {
  const {
    workflows
  } = useSelector((state: RootState) => state.maintain);
  const dispatch = useDispatch();
  const columns: TableColumnsType<WorkflowDataType> = useMemo(() => {
    return [
      {
        title: '工作流ID',
        dataIndex: 'workflowId',
        render: (text, record) => <a onClick={()=>{dispatch(setSelectedWorkflow(record))}}>{text}</a>,
      },
      {
        title: '工作流名称',
        dataIndex: 'workflowName',
      },
      {
        title: '项目名称',
        dataIndex: 'projectName',
      },
    ]
  }, []);
  return (
    <div className="workflows-list">
      <div>
        <div>
          <Input placeholder="搜索"></Input>
        </div>
      </div>
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