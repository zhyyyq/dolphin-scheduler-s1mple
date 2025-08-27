package com.example.scheduler.service;

import com.alibaba.fastjson.JSONObject;
import com.example.scheduler.dto.DashboardStatsDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;

@Service
public class DashboardService {
    private static final Logger logger = LoggerFactory.getLogger(DashboardService.class);
    @Autowired
    private DsService dsService;

    public JSONObject getStats(LocalDateTime startTime, LocalDateTime endTime, Long projectCode, Long workflowCode) throws Exception {
        DashboardStatsDto stats = new DashboardStatsDto();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

        String startTimeStr = startTime != null ? startTime.format(formatter) : null;
        String endTimeStr = endTime != null ? endTime.format(formatter) : null;
        Map<String, Object> processStateCount = dsService.getWorkflowInstanceStateCount(projectCode, startTimeStr, endTimeStr);
        Map<String, Object> taskStateCount = dsService.getTaskInstanceStateCount(projectCode, startTimeStr, endTimeStr);
        JSONObject res = new JSONObject();
        res.put("workflowStats", processStateCount);
        res.put("taskStats", taskStateCount);
        return res;
    }

}
