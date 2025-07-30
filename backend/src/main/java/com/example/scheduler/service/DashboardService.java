package com.example.scheduler.service;

import com.example.scheduler.dto.DashboardStatsDto;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@Service
public class DashboardService {
    private static final Logger logger = LoggerFactory.getLogger(DashboardService.class);
    @Autowired
    private DsService dsService;

    public DashboardStatsDto getStats(LocalDateTime startTime, LocalDateTime endTime, Long projectCode, Long workflowCode) {
        DashboardStatsDto stats = new DashboardStatsDto();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

        String startTimeStr = startTime != null ? startTime.format(formatter) : null;
        String endTimeStr = endTime != null ? endTime.format(formatter) : null;

        try {
            Map<String, Object> processStateCount = dsService.getWorkflowInstanceStateCount(projectCode, startTimeStr, endTimeStr);
            stats.setWorkflowStatusCount(calculateStatusCounts((List<Map<String, Object>>) processStateCount.get("workflowInstanceStatusCounts")));

            Map<String, Object> taskStateCount = dsService.getTaskInstanceStateCount(projectCode, startTimeStr, endTimeStr);
            stats.setTaskStatusCount(calculateStatusCounts((List<Map<String, Object>>) taskStateCount.get("taskInstanceStatusCounts")));

        } catch (Exception e) {
            // Handle exception
            stats.setWorkflowStatusCount(new DashboardStatsDto.StatusCount(0, 0, 0, 0));
            stats.setTaskStatusCount(new DashboardStatsDto.StatusCount(0, 0, 0, 0));
        }

        return stats;
    }

    private DashboardStatsDto.StatusCount calculateStatusCounts(List<Map<String, Object>> statusCounts) {
        long success = 0;
        long failure = 0;
        long running = 0;
        long waiting = 0;

        if (statusCounts != null) {
            for (Map<String, Object> statusCount : statusCounts) {
                String state = (String) statusCount.get("state");
                long count = ((Number) statusCount.get("count")).longValue();

                if (state != null) {
                    switch (state) {
                        case "SUCCESS":
                            success += count;
                            break;
                        case "FAILURE":
                            failure += count;
                            break;
                        case "RUNNING_EXECUTION":
                            running += count;
                            break;
                        case "SUBMITTED_SUCCESS":
                        case "SERIAL_WAIT":
                        case "READY_PAUSE":
                        case "PAUSE":
                        case "READY_STOP":
                        case "STOP":
                        case "DELAY_EXECUTION":
                        case "READY_BLOCK":
                        case "BLOCK":
                        case "WAIT_TO_RUN":
                            waiting += count;
                            break;
                    }
                }
            }
        }

        return new DashboardStatsDto.StatusCount(success, failure, running, waiting);
    }
}
