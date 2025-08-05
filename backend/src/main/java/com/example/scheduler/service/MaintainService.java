package com.example.scheduler.service;

import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.example.scheduler.enums.WorkflowRunningStatusEnum;
import com.example.scheduler.enums.WorkflowQueryTimeTypeEnum;
import com.example.scheduler.mapper.WorkflowInstanceMapper;
import com.example.scheduler.mapper.TaskInstanceMapper;
import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;

@Service
public class MaintainService {
  private static final Logger logger = LoggerFactory.getLogger(MaintainService.class);
  @Autowired
  private DsService dsService;

  @Autowired
  private WorkflowInstanceMapper workflowInstanceMapper;

  @Autowired
  private TaskInstanceMapper taskInstanceMapper;
  // This service can be used to implement maintenance tasks
  // such as cleaning up old data, optimizing database, etc.
  // Currently, it is empty and can be extended as needed.

  public JSONObject getMaintenanceStatus(long[] projectCodes, String timeType, String[] timeRange)
      throws Exception {
    // This method can return the status of maintenance tasks
    // precheck projectsCodes
    List<Map<String, Object>> projectlist = dsService.getProjects();
    logger.info(projectlist.toString());
    if (projectCodes == null || projectCodes.length == 0) {
      // default to all projects
      logger.info("No project codes provided, defaulting to all projects.");
      projectCodes = projectlist.stream()
          .mapToLong(project -> (Long) project.get("code"))
          .toArray();
    } else {
      for (Long projectCode : projectCodes) {
        if (projectlist.stream().noneMatch(project -> ((Long) project.get("code")).equals(projectCode))) {
          throw new Exception("Project code " + projectCode + " does not exist.");
        }
      }
    }
    // precheck timeType
    java.util.Arrays.stream(WorkflowQueryTimeTypeEnum.values())
        .filter(type -> type.getCode() == Integer.parseInt(timeType))
        .findFirst()
        .orElseThrow(() -> new Exception("Invalid time type: " + timeType));
    logger.info(JSONObject.toJSON(projectCodes).toString());
    logger.info("timeRange: " + timeRange);
    logger.info("timeType: " + timeType);
    JSONObject res = new JSONObject();
    res.put("workflowStats", new JSONArray());
    res.put("taskStats", new JSONArray());
    // init response
    for (WorkflowRunningStatusEnum status : WorkflowRunningStatusEnum.values()) {
      res.getJSONArray("workflowStats")
          .add(new JSONObject().fluentPut("statusDesc", status.getDesc()).fluentPut("count", 0).fluentPut("statusCode",
              status.getCode()));
      res.getJSONArray("taskStats")
          .add(new JSONObject().fluentPut("statusDesc", status.getDesc()).fluentPut("count", 0).fluentPut("statusCode",
              status.getCode()));
    }
    // loop query dsService.getWorkflowInstances
    List<Map<String, Object>> instancesStats = this.getWorkflowInstancesStats(projectCodes, timeType, timeRange);
    logger.info("Instances stats: " + instancesStats);
    // update the response
    for (Map<String, Object> instance : instancesStats) {
      int statusCode = (int) instance.get("state");
      int count = ((Long) instance.get("count")).intValue();
      WorkflowRunningStatusEnum status = WorkflowRunningStatusEnum.fromCode(statusCode);
      if (status != null) {
        res.getJSONArray("workflowStats").stream()
            .filter(stat -> ((JSONObject) stat).getInteger("statusCode") == status.getCode())
            .findFirst()
            .ifPresent(stat -> ((JSONObject) stat).put("count", ((JSONObject) stat).getInteger("count") + count));
      }
    }
    List<Map<String, Object>> taskInstancesStats = this.getTaskInstancesStats(projectCodes, timeType,
        timeRange);
    logger.info("Task instances stats: " + taskInstancesStats);
    // update the response
    for (Map<String, Object> instance : taskInstancesStats) {
      int statusCode = (int) instance.get("state");
      int count = ((Long) instance.get("count")).intValue();
      WorkflowRunningStatusEnum status = WorkflowRunningStatusEnum.fromCode(statusCode);
      if (status != null) {
        res.getJSONArray("taskStats").stream()
            .filter(stat -> ((JSONObject) stat).getInteger("statusCode") == status.getCode())
            .findFirst()
            .ifPresent(stat -> ((JSONObject) stat).put("count", ((JSONObject) stat).getInteger("count") + count));
      }
    }
    return res;
  }

  private List<Map<String, Object>> getWorkflowInstancesStats(long[] projectCodes, String timeType,
      String[] timeRange) {
    // This method can be used to get the statistics of workflow instances
    // based on the project code, task status, and time range.
    // Currently, it is not implemented and can be extended as needed.
    logger.info("Getting workflow instances stats for project code: " + projectCodes + ", task status: " + ", time type: " + timeType + ", time range: " + String.join(", ", timeRange));
    if (Integer.parseInt(timeType) == WorkflowQueryTimeTypeEnum.SCHEDULE_TIME.getCode()) {
      List<Map<String, Object>> res = this.workflowInstanceMapper
          .queryProcessInstanceStatsByScheduleTime(timeRange[0], timeRange[1], projectCodes);
      logger.info("Workflow instances stats: " + res);
      return res;
    } else if (Integer.parseInt(timeType) == WorkflowQueryTimeTypeEnum.START_TIME.getCode()) {
      List<Map<String, Object>> res = this.workflowInstanceMapper
          .queryProcessInstanceStatsByStartTime(timeRange[0], timeRange[1], projectCodes);
      logger.info("Workflow instances stats: " + res);
      return res;
    } else {
      logger.error("Invalid time type code: " + timeType);
      throw new IllegalArgumentException("Invalid time type code: " + timeType);
    }
  }

  private List<Map<String, Object>> getTaskInstancesStats(long[] projectCodes, String timeType,
      String[] timeRange) {
    // This method can be used to get the statistics of workflow instances
    // based on the project code, task status, and time range.
    // Currently, it is not implemented and can be extended as needed.
    logger.info("Getting workflow instances stats for project code: " + projectCodes + ", task status: " + ", time type: " + timeType + ", time range: " + String.join(", ", timeRange));
    if (Integer.parseInt(timeType) == WorkflowQueryTimeTypeEnum.SCHEDULE_TIME.getCode()) {
      List<Map<String, Object>> res = this.taskInstanceMapper
          .queryTaskInstanceStatsByScheduleTime(timeRange[0], timeRange[1], projectCodes);
      logger.info("Workflow instances stats: " + res);
      return res;
    } else if (Integer.parseInt(timeType) == WorkflowQueryTimeTypeEnum.START_TIME.getCode()) {
      List<Map<String, Object>> res = this.taskInstanceMapper
          .queryTaskInstanceStatsByStartTime(timeRange[0], timeRange[1], projectCodes);
      logger.info("Workflow instances stats: " + res);
      return res;
    } else {
      logger.error("Invalid time type code: " + timeType);
      throw new IllegalArgumentException("Invalid time type code: " + timeType);
    }
  }

  public JSONObject getMaintenanceInstances(long[] projectCodes, String timeType, String[] timeRange, String status,
      int page, int pageSize, String searchW) {
    // TODO Auto-generated method stub
    throw new UnsupportedOperationException("Unimplemented method 'getMaintenanceInstances'");
  }
}
