package com.example.scheduler.enums;

public enum WorkflowQueryTimeTypeEnum {
  SCHEDULE_TIME(0, "调度时间"),
  START_TIME(1, "开始时间");

  private final int code;
  private final String desc;

  WorkflowQueryTimeTypeEnum(int code, String desc) {
    this.code = code;
    this.desc = desc;
  }

  public int getCode() {
    return code;
  }

  public String getDesc() {
    return desc;
  }
}
