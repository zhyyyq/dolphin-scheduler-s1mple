package com.example.scheduler.dto;

import com.example.scheduler.model.TDsProcessInstance;
import com.example.scheduler.model.TDsTaskInstance;
import lombok.Data;

import java.util.List;

@Data
public class ProcessWithTasks {
    private final TDsProcessInstance processInstance;
    private final List<TDsTaskInstance> taskInstances;

    public ProcessWithTasks(TDsProcessInstance processInstance, List<TDsTaskInstance> taskInstances) {
        this.processInstance = processInstance;
        this.taskInstances = taskInstances;
    }

}