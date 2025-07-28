package com.example.scheduler.controller;

import com.example.scheduler.service.DsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/ds")
public class DsController {

    @Autowired
    private DsService dsService;

    @GetMapping("/datasources")
    public ResponseEntity<?> getDatasources() {
        try {
            return ResponseEntity.ok(dsService.getDatasources());
        } catch (Exception e) {
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }

    @GetMapping("/workflows")
    public ResponseEntity<?> getWorkflows() {
        try {
            return ResponseEntity.ok(dsService.getWorkflows());
        } catch (Exception e) {
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }

    @GetMapping("/projects")
    public ResponseEntity<?> getProjects() {
        try {
            return ResponseEntity.ok(dsService.getProjects());
        } catch (Exception e) {
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }

    @GetMapping("/projects/{projectCode}/workflows")
    public ResponseEntity<?> getWorkflowsByProject(@PathVariable Long projectCode) {
        try {
            return ResponseEntity.ok(dsService.getWorkflowsByProject(projectCode));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }

    @DeleteMapping("/project/{projectCode}/workflow/{workflowCode}")
    public ResponseEntity<?> deleteDsWorkflow(@PathVariable Long projectCode, @PathVariable Long workflowCode) {
        try {
            dsService.deleteDsWorkflow(projectCode, workflowCode);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }

    @PostMapping("/execute/{projectCode}/{processDefinitionCode}")
    public ResponseEntity<?> executeDsWorkflow(@PathVariable String projectCode, @PathVariable String processDefinitionCode, @RequestBody Map<String, Object> payload) {
        try {
            return ResponseEntity.ok(dsService.executeDsWorkflow(projectCode, processDefinitionCode, payload));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }

    @PostMapping("/workflow")
    public ResponseEntity<?> createOrUpdateDsWorkflow(@RequestBody Map<String, Object> payload) {
        try {
            return ResponseEntity.ok(dsService.createOrUpdateWorkflow(payload));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }

    @PostMapping("/projects/{projectCode}/schedules")
    public ResponseEntity<?> createSchedule(@PathVariable Long projectCode, @RequestBody Map<String, Object> payload) {
        try {
            // The createSchedule method now returns the created schedule object, which we pass to ok()
            return ResponseEntity.ok(dsService.createSchedule(projectCode, payload));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }

    @PostMapping("/projects/{projectCode}/schedules/{scheduleId}/online")
    public ResponseEntity<?> onlineSchedule(@PathVariable Long projectCode, @PathVariable int scheduleId) {
        try {
            dsService.onlineSchedule(projectCode, scheduleId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }

    @GetMapping("/projects/{projectCode}/instances")
    public ResponseEntity<?> getWorkflowInstances(
            @PathVariable Long projectCode,
            @RequestParam(required = false) String stateType,
            @RequestParam(defaultValue = "1") int pageNo,
            @RequestParam(defaultValue = "10") int pageSize) {
        try {
            return ResponseEntity.ok(dsService.getWorkflowInstances(projectCode, stateType, pageNo, pageSize));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }

    @GetMapping("/projects/{projectCode}/instances/{instanceId}")
    public ResponseEntity<?> getWorkflowInstanceDetail(
            @PathVariable Long projectCode,
            @PathVariable Integer instanceId) {
        try {
            return ResponseEntity.ok(dsService.getWorkflowInstanceDetail(projectCode, instanceId));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }

    @GetMapping("/log/{taskInstanceId}")
    public ResponseEntity<?> getTaskInstanceLog(@PathVariable Integer taskInstanceId) {
        try {
            return ResponseEntity.ok(dsService.getTaskInstanceLog(taskInstanceId));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }
}
