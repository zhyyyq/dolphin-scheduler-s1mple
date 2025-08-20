package com.example.scheduler.enums;


// WorkflowExecutionStatus{code=0, desc='submit success'}, WorkflowExecutionStatus{code=1, desc='running'}, WorkflowExecutionStatus{code=2, desc='ready pause'}, WorkflowExecutionStatus{code=3, desc='pause'}, WorkflowExecutionStatus{code=4, desc='ready stop'}, WorkflowExecutionStatus{code=5, desc='stop'}, WorkflowExecutionStatus{code=6, desc='failure'}, WorkflowExecutionStatus{code=7, desc='success'}, WorkflowExecutionStatus{code=12, desc='delay execution'}, WorkflowExecutionStatus{code=14, desc='serial wait'}, WorkflowExecutionStatus{code=15, desc='ready block'}, WorkflowExecutionStatus{code=16, desc='block'}, WorkflowExecutionStatus{code=17, desc='wait to run'}

import lombok.Getter;

@Getter
public enum WorkflowRunningStatusEnum {
    SUBMITTED(0, "submitted"),
    RUNNING(1, "running"),
    READY_PAUSE(2, "ready pause"),
    PAUSE(3, "pause"),
    READY_STOP(4, "ready stop"),
    STOP(5, "stop"),
    FAILURE(6, "failure"),
    SUCCESS(7, "success"),
    SERIAL_WAIT(14, "serial wait"),
    FORCED_STOP(9, "forced stop");

    private final int code;
    private final String desc;

    WorkflowRunningStatusEnum(int code, String desc) {
        this.code = code;
        this.desc = desc;
    }

    public static boolean isValidCode(String code) {
        try {
            int intCode = Integer.parseInt(code);
            for (WorkflowRunningStatusEnum status : WorkflowRunningStatusEnum.values()) {
                if (status.getCode() == intCode) {
                    return true;
                }
            }
        } catch (NumberFormatException e) {
            // Ignore, return false
        }
        return false;
    }

    public static WorkflowRunningStatusEnum fromCode(int code) {
        for (WorkflowRunningStatusEnum status : WorkflowRunningStatusEnum.values()) {
            if (status.getCode() == code) {
                return status;
            }
        }
        return null;
    }

    public String toString() {
        return "WorkflowRunningStatusEnum{" +
                "code=" + code +
                ", desc='" + desc + '\'' +
                '}';
    }
}
