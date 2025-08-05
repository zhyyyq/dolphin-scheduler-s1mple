package com.example.scheduler.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;


import com.alibaba.fastjson.JSONObject;
import com.example.scheduler.service.MaintainService;

@RestController
@RequestMapping("/api/maintain")
public class MaintainController {
  @Autowired
  private MaintainService maintainService;

  @GetMapping("/stats")
  public ResponseEntity<?> stats(@RequestParam(value = "projectCodes", required = false) Long[] projectCodes,
      @RequestParam(value = "timeRange", required = false) String[] timeRange,
      @RequestParam(value = "taskStatus", required = false) String taskStatus) {
    try {
      JSONObject res = maintainService.getMaintenanceStatus(projectCodes, timeRange, taskStatus);
      return ResponseEntity.ok(res);
    } catch (Exception e) {
      e.printStackTrace();
      return ResponseEntity.status(500).body(e.getMessage());
    }
  }

}
