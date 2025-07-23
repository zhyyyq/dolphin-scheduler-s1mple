package com.example.scheduler.controller;

import com.example.scheduler.dto.WorkflowDto;
import com.example.scheduler.service.WorkflowService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/workflows")
public class WorkflowController {

    @Autowired
    private WorkflowService workflowService;

    @PostMapping("/yaml")
    public ResponseEntity<?> saveWorkflowYaml(@RequestBody WorkflowDto workflowDto) {
        try {
            return ResponseEntity.ok(workflowService.saveWorkflowYaml(workflowDto));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }

    @GetMapping("/local")
    public ResponseEntity<?> getLocalWorkflows() {
        try {
            return ResponseEntity.ok(workflowService.getLocalWorkflows());
        } catch (Exception e) {
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }

    @GetMapping("/{workflowUuid}")
    public ResponseEntity<?> getWorkflowDetails(@PathVariable String workflowUuid) {
        try {
            return ResponseEntity.ok(workflowService.getWorkflowDetails(workflowUuid));
        } catch (Exception e) {
            return ResponseEntity.status(404).body(e.getMessage());
        }
    }

    @GetMapping("/combined")
    public ResponseEntity<?> getCombinedWorkflows() {
        try {
            return ResponseEntity.ok(workflowService.getCombinedWorkflows());
        } catch (Exception e) {
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }

    @PostMapping("/{workflowUuid}/online")
    public ResponseEntity<?> onlineWorkflow(@PathVariable String workflowUuid) {
        try {
            workflowService.onlineWorkflow(workflowUuid);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }

    @DeleteMapping("/{workflowUuid}")
    public ResponseEntity<?> deleteWorkflow(@PathVariable String workflowUuid,
                                             @RequestParam(required = false) Long projectCode,
                                             @RequestParam(required = false) Long workflowCode) {
        try {
            workflowService.deleteWorkflow(workflowUuid, projectCode, workflowCode);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }
}
