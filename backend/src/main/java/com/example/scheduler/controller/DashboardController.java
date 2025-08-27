package com.example.scheduler.controller;

import com.alibaba.fastjson.JSONObject;
import com.example.scheduler.service.DashboardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    @Autowired
    private DashboardService dashboardService;

    @GetMapping("/stats")
    public JSONObject getStats(
            @RequestParam(required = false) String startTime,
            @RequestParam(required = false) String endTime,
            @RequestParam(required = false) String projectCode,
            @RequestParam(required = false) String workflowCode) throws Exception {

        LocalDateTime start = null;
        if (startTime != null && !startTime.isEmpty() && !"undefined".equals(startTime)) {
            start = LocalDateTime.parse(startTime);
        }

        LocalDateTime end = null;
        if (endTime != null && !endTime.isEmpty() && !"undefined".equals(endTime)) {
            end = LocalDateTime.parse(endTime);
        }

        Long pCode = null;
        if (projectCode != null && !projectCode.isEmpty() && !"null".equals(projectCode)) {
            pCode = Long.parseLong(projectCode);
        }

        Long wCode = null;
        if (workflowCode != null && !workflowCode.isEmpty() && !"null".equals(workflowCode)) {
            wCode = Long.parseLong(workflowCode);
        }

        return dashboardService.getStats(start, end, pCode, wCode);
    }
}
