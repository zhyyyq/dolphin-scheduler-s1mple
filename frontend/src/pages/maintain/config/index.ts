
export enum workflow_instance_status {
  SUBMITTED = 0,
  RUNNING = 1,
  READY_PAUSE = 2,
  PAUSE = 3,
  READY_STOP = 4,
  STOP = 5,
  FAILURE = 6,
  SUCCESS = 7,
  SERIAL_WAIT = 14,
  FAILOVER = 18
}

export const get_chinese_workflow_instance_status = (status: number): string => {
  switch (status) {
    case -1:
      return '执行记录';
    case workflow_instance_status.SUBMITTED:
      return '已提交';
    case workflow_instance_status.RUNNING:
      return '运行中';
    case workflow_instance_status.READY_PAUSE:
      return '准备暂停';
    case workflow_instance_status.PAUSE:
      return '暂停';
    case workflow_instance_status.READY_STOP:
      return '准备停止';
    case workflow_instance_status.STOP:
      return '已停止';
    case workflow_instance_status.FAILURE:
      return '失败';
    case workflow_instance_status.SUCCESS:
      return '成功';
    case workflow_instance_status.SERIAL_WAIT:
      return '串行等待';
    case workflow_instance_status.FAILOVER:
      return '故障转移';
    default:
      return '未知状态';
  }
}

