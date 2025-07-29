package com.example.scheduler.dto;

import java.util.List;

public class DashboardStatsDto {

    private double projectHealth;
    private double workflowHealth;
    private double taskHealth;
    private double resourceUtilization;
    private List<TrendData> workflowTrend;
    private List<TrendData> taskTrend;
    private List<TopData> failedTasks;
    private List<TopData> slowTasks;
    private List<TopData> slowWorkflows;
    private List<GanttData> ganttData;

    public static class TrendData {
        private String date;
        private int count;
        private String status;

        public TrendData(String date, int count, String status) {
            this.date = date;
            this.count = count;
            this.status = status;
        }

        public String getDate() {
            return date;
        }

        public void setDate(String date) {
            this.date = date;
        }

        public int getCount() {
            return count;
        }

        public void setCount(int count) {
            this.count = count;
        }

        public String getStatus() {
            return status;
        }

        public void setStatus(String status) {
            this.status = status;
        }
    }

    public static class TopData {
        private String name;
        private int count;
        private long duration;

        public TopData(String name, int count, long duration) {
            this.name = name;
            this.count = count;
            this.duration = duration;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public int getCount() {
            return count;
        }

        public void setCount(int count) {
            this.count = count;
        }

        public long getDuration() {
            return duration;
        }

        public void setDuration(long duration) {
            this.duration = duration;
        }
    }

    public static class GanttData {
        private String workflow;
        private String status;
        private long duration;

        public GanttData(String workflow, String status, long duration) {
            this.workflow = workflow;
            this.status = status;
            this.duration = duration;
        }

        public String getWorkflow() {
            return workflow;
        }

        public void setWorkflow(String workflow) {
            this.workflow = workflow;
        }

        public String getStatus() {
            return status;
        }

        public void setStatus(String status) {
            this.status = status;
        }

        public long getDuration() {
            return duration;
        }

        public void setDuration(long duration) {
            this.duration = duration;
        }
    }

    public double getProjectHealth() {
        return projectHealth;
    }

    public void setProjectHealth(double projectHealth) {
        this.projectHealth = projectHealth;
    }

    public double getWorkflowHealth() {
        return workflowHealth;
    }

    public void setWorkflowHealth(double workflowHealth) {
        this.workflowHealth = workflowHealth;
    }

    public double getTaskHealth() {
        return taskHealth;
    }

    public void setTaskHealth(double taskHealth) {
        this.taskHealth = taskHealth;
    }

    public double getResourceUtilization() {
        return resourceUtilization;
    }

    public void setResourceUtilization(double resourceUtilization) {
        this.resourceUtilization = resourceUtilization;
    }

    public List<TrendData> getWorkflowTrend() {
        return workflowTrend;
    }

    public void setWorkflowTrend(List<TrendData> workflowTrend) {
        this.workflowTrend = workflowTrend;
    }

    public List<TrendData> getTaskTrend() {
        return taskTrend;
    }

    public void setTaskTrend(List<TrendData> taskTrend) {
        this.taskTrend = taskTrend;
    }

    public List<TopData> getFailedTasks() {
        return failedTasks;
    }

    public void setFailedTasks(List<TopData> failedTasks) {
        this.failedTasks = failedTasks;
    }

    public List<TopData> getSlowTasks() {
        return slowTasks;
    }

    public void setSlowTasks(List<TopData> slowTasks) {
        this.slowTasks = slowTasks;
    }

    public List<TopData> getSlowWorkflows() {
        return slowWorkflows;
    }

    public void setSlowWorkflows(List<TopData> slowWorkflows) {
        this.slowWorkflows = slowWorkflows;
    }

    public List<GanttData> getGanttData() {
        return ganttData;
    }

    public void setGanttData(List<GanttData> ganttData) {
        this.ganttData = ganttData;
    }
}
