package com.example.scheduler.controller;

import com.example.scheduler.dto.DashboardStatsDto;
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
    public DashboardStatsDto getStats(
            @RequestParam(required = false) String startTime,
            @RequestParam(required = false) String endTime,
            @RequestParam(required = false) Long projectCode,
            @RequestParam(required = false) Long workflowCode) {
        
        LocalDateTime start = null;
        if (startTime != null && !startTime.isEmpty() && !"undefined".equals(startTime)) {
            start = LocalDateTime.parse(startTime);
        }

        LocalDateTime end = null;
        if (endTime != null && !endTime.isEmpty() && !"undefined".equals(endTime)) {
            end = LocalDateTime.parse(endTime);
        }

        return dashboardService.getStats(start, end, projectCode, workflowCode);
    }
}
