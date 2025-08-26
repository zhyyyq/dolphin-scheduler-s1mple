import React, { useCallback, useMemo } from "react";
import './index.less';
import { get_chinese_workflow_instance_status, workflow_instance_status } from "../../config";
import { FolderAddTwoTone, ClockCircleTwoTone, StopTwoTone, PauseCircleTwoTone, CloseCircleTwoTone, CheckCircleTwoTone, CloseSquareTwoTone } from "@ant-design/icons";
import { AppDispatch, RootState } from "@/store";
import { useDispatch, useSelector } from "react-redux";
import { setSelectedTaskType } from "@/store/slices/maintainSlice";
export const get_icon_by_workflow_instance_status = (status: number): any => {
  switch (status) {
    case workflow_instance_status.SUBMITTED:
      return <FolderAddTwoTone/>;
    case workflow_instance_status.RUNNING:
      return <ClockCircleTwoTone/>;
    case workflow_instance_status.READY_PAUSE:
      return <StopTwoTone twoToneColor={"orange"}/>;
    case workflow_instance_status.PAUSE:
      return <PauseCircleTwoTone twoToneColor={"orange"}/>;
    case workflow_instance_status.READY_STOP:
      return <StopTwoTone twoToneColor={"orange"}/>;
    case workflow_instance_status.STOP:
      return <PauseCircleTwoTone twoToneColor={"gray"}/>;
    case workflow_instance_status.FAILURE:
      return <CloseCircleTwoTone twoToneColor={"red"}/>;
    case workflow_instance_status.SUCCESS:
      return <CheckCircleTwoTone twoToneColor={"green"}/>;
    case workflow_instance_status.SERIAL_WAIT:
      return <ClockCircleTwoTone/>;
    case workflow_instance_status.FAILOVER:
      return <CloseSquareTwoTone/>;
    default:
      return '';
  }
}
const StatsItem: React.FC<{ statusCode: number, value: number }> = ({ statusCode, value  }) => {
  const dispatch: AppDispatch = useDispatch();
  const {
    selectedTaskType
  } = useSelector((state: RootState) => state.maintain);
  const renderIcon = useMemo(() => {
    return get_icon_by_workflow_instance_status(statusCode);
  }, [statusCode]);
  const handleClick = useCallback(() => {
    dispatch(setSelectedTaskType(selectedTaskType === statusCode ? undefined: statusCode));
    // Handle click event if needed
  }, [statusCode, selectedTaskType]);
  

  return (
    <div className={`stats-item ${selectedTaskType == statusCode ? 'active': ''}`} onClick={handleClick}>
      <div className="stats-item-value">{value}</div>
      <div className="stats-item-title">{ renderIcon }{get_chinese_workflow_instance_status(statusCode)}</div>
    </div>
  );
}
export default StatsItem;