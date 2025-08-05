package com.example.scheduler.service;

import java.util.List;
import java.util.Map;

import org.hibernate.boot.registry.classloading.spi.ClassLoaderService.Work;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.example.scheduler.enums.WorkflowRunningStatusEnum;
import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;

@Service
public class MaintainService {
  private static final Logger logger = LoggerFactory.getLogger(MaintainService.class);
  @Autowired
  private DsService dsService;
  // This service can be used to implement maintenance tasks
  // such as cleaning up old data, optimizing database, etc.
  // Currently, it is empty and can be extended as needed.

  public JSONObject getMaintenanceStatus(Long[] projectCodes, String[] timeRange, String taskStaus)
      throws Exception {
    // This method can return the status of maintenance tasks
    // precheck projectsCodes
    List<Map<String, Object>> projectlist = dsService.getProjects();
    logger.info(projectlist.toString());
    if (projectCodes == null || projectCodes.length == 0) {
      // default to all projects
      logger.info("No project codes provided, defaulting to all projects.");
      projectCodes = projectlist.stream()
          .map(project -> (Long) project.get("code"))
          .toArray(Long[]::new);
    } else {
      for (Long projectCode : projectCodes) {
        if (projectlist.stream().noneMatch(project -> ((Long) project.get("code")).equals(projectCode))) {
          throw new Exception("Project code " + projectCode + " does not exist.");
        }
      }
    }
    logger.info(JSONObject.toJSON(projectCodes).toString());
    logger.info("timeRange: " + timeRange);
    logger.info("taskStatus: " + taskStaus);
    JSONObject res = new JSONObject();
    res.put("taskStats", new JSONArray());
    // init response
    for (WorkflowRunningStatusEnum status : WorkflowRunningStatusEnum.values()) {
      res.getJSONArray("taskStats")
          .add(new JSONObject().fluentPut("statusDesc", status.getDesc()).fluentPut("count", 0).fluentPut("statusCode", status.getCode()));
    }
    // loop query dsService.getWorkflowInstances
    for (Long projectCode : projectCodes) {
      // loop WorkflowRunningStatusEnum
      if (taskStaus != null) {
        if (!WorkflowRunningStatusEnum.isValidCode(taskStaus)) {
          logger.error("Invalid task status code: " + taskStaus);
          throw new Exception("Invalid task status code: " + taskStaus);
        }
        Map<String, Object> instancesStats = dsService.getWorkflowInstances(projectCode, taskStaus, 1, 10, timeRange[0], timeRange[1]);
        logger.info("Instances stats: " + instancesStats);
      } else {
        for (WorkflowRunningStatusEnum status : WorkflowRunningStatusEnum.values()) {
          Map<String,Object> instances = dsService.getWorkflowInstances(projectCode, status.name(), 1, 10, timeRange[0], timeRange[1]);
          logger.info("Instances for project " + projectCode + " with status " + status.getDesc() + ": " + instances);
          // Update the count in the response
          int count = res.getJSONArray("taskStats").stream()
              .filter(item -> ((JSONObject) item).getString("statusCode").equals(status.getCode()+""))
              .mapToInt(item -> ((JSONObject) item).getInteger("count"))
              .findFirst()
              .orElse(0);
          logger.info(status + "old count: " + count);
          logger.info(status + "new count: " + (int) (instances.get("total")));
          int updatedCount = count + (int) (instances.get("total"));
          logger.info("Updated count: " + updatedCount);
          res.getJSONArray("taskStats").stream()
              .filter(item -> ((JSONObject) item).getString("statusCode").equals(status.getCode()+""))
              .forEach(item -> {
                logger.info("Updating count for status " + status.getDesc() + " to " + updatedCount);
                ((JSONObject) item).put("count", updatedCount);
              });
        }
      }

    }
    res.put("status", "OK");
    res.put("message", "No maintenance tasks running.");
    return res;
  }
}
