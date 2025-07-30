package com.example.scheduler.service;

import com.example.scheduler.dto.DashboardStatsDto;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@Service
public class DashboardService {

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
                    if (state.contains("desc='success'")) {
                        success += count;
                    } else if (state.contains("desc='failure'")) {
                        failure += count;
                    } else if (state.contains("desc='running'")) {
                        running += count;
                    } else if (state.contains("desc='submit success'") || state.contains("desc='serial wait'")) {
                        waiting += count;
                    }
                }
            }
        }

        return new DashboardStatsDto.StatusCount(success, failure, running, waiting);
    }
}
