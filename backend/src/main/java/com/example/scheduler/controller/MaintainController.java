package com.example.scheduler.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.example.scheduler.service.MaintainService;

@RestController
@RequestMapping("/api/maintain")
public class MaintainController {
  @Autowired
  private MaintainService maintainService;

  @GetMapping("/stats")
  public ResponseEntity<?> stats(@RequestParam(value = "projectCodes", required = false) long[] projectCodes,
      @RequestParam(value = "timeType", required = false) String timeType,
      @RequestParam(value = "timeRange", required = false) String[] timeRange
  ) {
    try {
      JSONObject res = maintainService.getMaintenanceStatus(projectCodes, timeType, timeRange);
      return ResponseEntity.ok(res);
    } catch (Exception e) {
      e.printStackTrace();
      return ResponseEntity.status(500).body(e.getMessage());
    }
  }

  @GetMapping("/instances")
  public ResponseEntity<?> instances(@RequestParam(value = "projectCodes", required = false) long[] projectCodes,
      @RequestParam(value = "timeType", required = false) String timeType,
      @RequestParam(value = "timeRange", required = false) String[] timeRange
  ) {
    try {
      JSONArray res = maintainService.getMaintenanceInstances(projectCodes, timeType, timeRange);
      return ResponseEntity.ok(res);
    } catch (Exception e) {
      e.printStackTrace();
      return ResponseEntity.status(500).body(e.getMessage());
    }
  }
}
