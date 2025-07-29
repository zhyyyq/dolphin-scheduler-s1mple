package com.example.scheduler.service;

import com.example.scheduler.dto.DashboardStatsDto;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class DashboardService {

    @Autowired
    private DsService dsService;

    public DashboardStatsDto getStats(LocalDateTime startTime, LocalDateTime endTime, Long projectCode, Long workflowCode) {
        DashboardStatsDto stats = new DashboardStatsDto();

        try {
            // Health
            Map<String, Object> processStateCount = dsService.getWorkflowInstanceStateCount(projectCode);
            long totalProcesses = (long) processStateCount.get("total");
            long successProcesses = (long) processStateCount.get("success");
            stats.setWorkflowHealth(totalProcesses > 0 ? (double) successProcesses / totalProcesses : 0);

            Map<String, Object> taskStateCount = dsService.getTaskInstanceStateCount(projectCode);
            long totalTasks = (long) taskStateCount.get("total");
            long successTasks = (long) taskStateCount.get("success");
            stats.setTaskHealth(totalTasks > 0 ? (double) successTasks / totalTasks : 0);

            // For project health, we can average the workflow health of all projects
            List<Map<String, Object>> projects = dsService.getProjects();
            double totalProjectHealth = 0;
            for (Map<String, Object> project : projects) {
                long currentProjectCode = ((Number) project.get("code")).longValue();
                Map<String, Object> projectProcessStateCount = dsService.getWorkflowInstanceStateCount(currentProjectCode);
                long projectTotalProcesses = (long) projectProcessStateCount.get("total");
                long projectSuccessProcesses = (long) projectProcessStateCount.get("success");
                totalProjectHealth += projectTotalProcesses > 0 ? (double) projectSuccessProcesses / projectTotalProcesses : 0;
            }
            stats.setProjectHealth(projects.size() > 0 ? totalProjectHealth / projects.size() : 0);


            // Trend Data
            List<DashboardStatsDto.TrendData> workflowTrend = new ArrayList<>();
            List<DashboardStatsDto.TrendData> taskTrend = new ArrayList<>();
            if (startTime != null && endTime != null) {
                for (LocalDateTime date = startTime; date.isBefore(endTime); date = date.plusDays(1)) {
                    String dateStr = date.toLocalDate().toString();
                    Map<String, Object> dailyProcessStateCount = dsService.getWorkflowInstanceStateCount(projectCode, date.toLocalDate().toString(), date.plusDays(1).toLocalDate().toString());
                    workflowTrend.add(new DashboardStatsDto.TrendData(dateStr, (int)(long)dailyProcessStateCount.get("success"), "SUCCESS"));
                    workflowTrend.add(new DashboardStatsDto.TrendData(dateStr, (int)(long)dailyProcessStateCount.get("failure"), "FAILURE"));

                    Map<String, Object> dailyTaskStateCount = dsService.getTaskInstanceStateCount(projectCode, date.toLocalDate().toString(), date.plusDays(1).toLocalDate().toString());
                    taskTrend.add(new DashboardStatsDto.TrendData(dateStr, (int)(long)dailyTaskStateCount.get("success"), "SUCCESS"));
                    taskTrend.add(new DashboardStatsDto.TrendData(dateStr, (int)(long)dailyTaskStateCount.get("failure"), "FAILURE"));
                }
            }
            stats.setWorkflowTrend(workflowTrend);
            stats.setTaskTrend(taskTrend);

            // Top Data
            if (projectCode != null) {
                List<Map<String, Object>> slowWorkflowsData = dsService.getTopNLongestRunningProcessInstance(projectCode, 10);
                List<DashboardStatsDto.TopData> slowWorkflows = new ArrayList<>();
                for(Map<String, Object> data : slowWorkflowsData) {
                    slowWorkflows.add(new DashboardStatsDto.TopData((String)data.get("name"), 0, (long)data.get("duration")));
                }
                stats.setSlowWorkflows(slowWorkflows);
            } else {
                stats.setSlowWorkflows(new ArrayList<>());
            }


            // Gantt Data
            List<DashboardStatsDto.GanttData> ganttData = new ArrayList<>();
            if (projectCode != null) {
                Map<String, Object> workflowInstances = dsService.getWorkflowInstances(projectCode, null, 1, 20);
                List<Map<String, Object>> instanceList = (List<Map<String, Object>>) workflowInstances.get("totalList");
                for (Map<String, Object> instance : instanceList) {
                    long duration = Duration.between(LocalDateTime.parse(instance.get("startTime").toString().replace(" ", "T")), LocalDateTime.parse(instance.get("endTime").toString().replace(" ", "T"))).toMillis();
                    ganttData.add(new DashboardStatsDto.GanttData(instance.get("name").toString(), instance.get("state").toString(), duration));
                }
            }
            stats.setGanttData(ganttData);

            // Resource Utilization
            Map<String, Object> queueCount = dsService.getQueueCount();
            long totalQueueSize = (long) queueCount.get("total");
            long runningQueueSize = (long) queueCount.get("running");
            stats.setResourceUtilization(totalQueueSize > 0 ? (double) runningQueueSize / totalQueueSize : 0);


        } catch (Exception e) {
            // Handle exception
        }

        return stats;
    }

    private List<DashboardStatsDto.TopData> aggregateAndSort(List<DashboardStatsDto.TopData> list, String by) {
        Map<String, DashboardStatsDto.TopData> map = new HashMap<>();
        for (DashboardStatsDto.TopData item : list) {
            if (map.containsKey(item.getName())) {
                DashboardStatsDto.TopData existing = map.get(item.getName());
                if ("count".equals(by)) {
                    existing.setCount(existing.getCount() + 1);
                } else {
                    existing.setDuration(Math.max(existing.getDuration(), item.getDuration()));
                }
            } else {
                map.put(item.getName(), item);
            }
        }
        List<DashboardStatsDto.TopData> result = new ArrayList<>(map.values());
        result.sort((a, b) -> {
            if ("count".equals(by)) {
                return b.getCount() - a.getCount();
            } else {
                return (int) (b.getDuration() - a.getDuration());
            }
        });
        return result;
    }
}
