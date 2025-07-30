package com.example.scheduler.dto;

public class DashboardStatsDto {

    private StatusCount workflowStatusCount;
    private StatusCount taskStatusCount;

    public static class StatusCount {
        private long success;
        private long failure;
        private long running;
        private long waiting;

        public StatusCount(long success, long failure, long running, long waiting) {
            this.success = success;
            this.failure = failure;
            this.running = running;
            this.waiting = waiting;
        }

        // Getters and Setters
        public long getSuccess() {
            return success;
        }

        public void setSuccess(long success) {
            this.success = success;
        }

        public long getFailure() {
            return failure;
        }

        public void setFailure(long failure) {
            this.failure = failure;
        }

        public long getRunning() {
            return running;
        }

        public void setRunning(long running) {
            this.running = running;
        }

        public long getWaiting() {
            return waiting;
        }

        public void setWaiting(long waiting) {
            this.waiting = waiting;
        }
    }

    public StatusCount getWorkflowStatusCount() {
        return workflowStatusCount;
    }

    public void setWorkflowStatusCount(StatusCount workflowStatusCount) {
        this.workflowStatusCount = workflowStatusCount;
    }

    public StatusCount getTaskStatusCount() {
        return taskStatusCount;
    }

    public void setTaskStatusCount(StatusCount taskStatusCount) {
        this.taskStatusCount = taskStatusCount;
    }
}
