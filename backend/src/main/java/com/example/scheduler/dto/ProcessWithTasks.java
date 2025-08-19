package com.example.scheduler.dto;

import java.util.List;

import com.example.scheduler.model.TDsProcessInstance;
import com.example.scheduler.model.TDsTaskInstance;

public class ProcessWithTasks {
    private TDsProcessInstance processInstance;
    private List<TDsTaskInstance> taskInstances;

    public ProcessWithTasks(TDsProcessInstance processInstance, List<TDsTaskInstance> taskInstances) {
        this.processInstance = processInstance;
        this.taskInstances = taskInstances;
    }

    public TDsProcessInstance getProcessInstance() {
        return processInstance;
    }

    public List<TDsTaskInstance> getTaskInstances() {
        return taskInstances;
    }

    public void setTaskInstances(List<TDsTaskInstance> taskInstances) {
        this.taskInstances = taskInstances;
    }
}