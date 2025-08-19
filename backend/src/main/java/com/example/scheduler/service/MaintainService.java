package com.example.scheduler.service;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.example.scheduler.dto.ProcessWithTasks;
import com.example.scheduler.enums.WorkflowQueryTimeTypeEnum;
import com.example.scheduler.enums.WorkflowRunningStatusEnum;
import com.example.scheduler.model.TDsProcessDefinition;
import com.example.scheduler.model.TDsProcessInstance;
import com.example.scheduler.model.TDsTaskInstance;
import com.example.scheduler.mapper.TDsProcessDefinitionMapper;
import com.example.scheduler.mapper.TDsProcessInstanceMapper;
import com.example.scheduler.mapper.TDsTaskInstanceMapper;
import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;

@Service
public class MaintainService {
  private static final Logger logger = LoggerFactory.getLogger(MaintainService.class);

  @Autowired
  private TDsTaskInstanceMapper tdsTaskInstanceMapper;

  @Autowired
  private TDsProcessInstanceMapper tDsProcessInstanceMapper;

  @Autowired
  private TDsProcessDefinitionMapper tDsProcessDefinitionMapper;

  public JSONObject getMaintenanceStatus(Long[] projectCodes, String timeType, String[] timeRange)
      throws Exception {
    LambdaQueryWrapper<TDsProcessInstance> processQueryWrapper = new LambdaQueryWrapper<>();
    // Ensure projectCodes is not null and has at least one element
    if (projectCodes != null && projectCodes.length > 0) {
      // Use the .in method with projectCodes
      processQueryWrapper.in(TDsProcessInstance::getProjectCode, projectCodes);
    }

    // Format dates
    SimpleDateFormat formatter = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");

    // Parse start and end time from timeRange
    Date startTime = formatter.parse(timeRange[0]);
    Date endTime = formatter.parse(timeRange[1]);

    // Check time type and apply between condition for the appropriate field
    if (Integer.parseInt(timeType) == WorkflowQueryTimeTypeEnum.START_TIME.getCode()) {
      processQueryWrapper.between(TDsProcessInstance::getStartTime, startTime, endTime);
    } else if (Integer.parseInt(timeType) == WorkflowQueryTimeTypeEnum.SCHEDULE_TIME.getCode()) {
      processQueryWrapper.between(TDsProcessInstance::getScheduleTime, startTime, endTime);
    }

    // Execute the query
    List<TDsProcessInstance> tDsProcessInstanceList = this.tDsProcessInstanceMapper.selectList(processQueryWrapper);

    // 查询关联的调度任务
    Integer[] instanceIds = tDsProcessInstanceList.stream()
        .map(TDsProcessInstance::getId)
        .toArray(Integer[]::new);
    List<TDsTaskInstance> tDsTaskInstanceList = this.tdsTaskInstanceMapper
        .selectList(new LambdaQueryWrapper<TDsTaskInstance>().in(TDsTaskInstance::getProcessInstanceId, instanceIds));

    // bind task to instance
    // Create a map from process ID to a list of associated task instances
    Map<Integer, List<TDsTaskInstance>> processToTasks = tDsTaskInstanceList.stream()
        .collect(Collectors.groupingBy(TDsTaskInstance::getProcessInstanceId));

    // Create a list of ProcessWithTasks objects
    List<ProcessWithTasks> processesWithTasks = new ArrayList<>();

    for (TDsProcessInstance process : tDsProcessInstanceList) {
      Integer processId = process.getId();
      List<TDsTaskInstance> tasks = processToTasks.getOrDefault(processId, new ArrayList<>());
      processesWithTasks.add(new ProcessWithTasks(process, tasks));
    }
    JSONObject resultMap = new JSONObject();
    // Add the result to the JSONObject
    resultMap.put("processListWithTasks", processesWithTasks);
    // stats calculate
    // taskStats: { statusDesc: string; count: number; statusCode: number }[];
    // workflowStats: { statusDesc: string; count: number; statusCode: number }[];
    // processList unique
    // Create workflowStats using groupingBy and counting
    List<Map<String, Object>> workflowStats = processesWithTasks.stream()
        .map(ProcessWithTasks::getProcessInstance)
        .map(TDsProcessInstance::getState)
        .collect(Collectors.groupingBy(
            statusCode -> WorkflowRunningStatusEnum.values()[statusCode].getDesc(),
            Collectors.counting()))
        .entrySet().stream()
        .map(entry -> {
          Map<String, Object> stat = new HashMap<>();
          stat.put("statusDesc", entry.getKey());
          stat.put("count", entry.getValue());
          stat.put("statusCode",
              WorkflowRunningStatusEnum.valueOf(entry.getKey().toUpperCase().replace(" ", "_")).getCode());
          return stat;
        })
        .collect(Collectors.toList());
    resultMap.put("workflowStats", workflowStats);
    List<Map<String, Object>> taskStats = processesWithTasks.stream()
        .map(ProcessWithTasks::getTaskInstances) // Returns List<TDsTaskInstance>
        .flatMap(taskInstances -> taskInstances.stream()) // Convert List<TDsTaskInstance> to Stream<TDsTaskInstance>
        .map(TDsTaskInstance::getState) // Map to the state of each task instance
        .collect(Collectors.groupingBy(
            statusCode -> WorkflowRunningStatusEnum.values()[statusCode].getDesc(),
            Collectors.counting()))
        .entrySet().stream()
        .map(entry -> {
          Map<String, Object> stat = new HashMap<>();
          stat.put("statusDesc", entry.getKey());
          stat.put("count", entry.getValue());
          stat.put("statusCode",
              WorkflowRunningStatusEnum.valueOf(entry.getKey().toUpperCase().replace(" ", "_")).getCode());
          return stat;
        })
        .collect(Collectors.toList());
    resultMap.put("taskStats", taskStats);
    // processList 
    Long[] processDefinitionCodeList = processesWithTasks.stream()
    .map(ProcessWithTasks::getProcessInstance)  // Get ProcessInstance
    .map(TDsProcessInstance::getProcessDefinitionCode)  // Get processDefinitionCode (Long)
    .toArray(Long[]::new); // Convert to Integer array
    logger.info("processDefinitionCodeList" + processDefinitionCodeList.toString());
    List<TDsProcessDefinition> tDsProcessDefinitionList = this.tDsProcessDefinitionMapper.selectList(
        new LambdaQueryWrapper<TDsProcessDefinition>().in(TDsProcessDefinition::getCode, processDefinitionCodeList));
    logger.info(tDsProcessDefinitionList.toString());
    resultMap.put("processDefinitionList", tDsProcessDefinitionList);
    return resultMap;
  }
}
