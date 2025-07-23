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

    @GetMapping("/workflows")
    public ResponseEntity<?> getWorkflows() {
        try {
            return ResponseEntity.ok(dsService.getWorkflows());
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
    public ResponseEntity<?> executeDsWorkflow(@PathVariable Long projectCode, @PathVariable Long processDefinitionCode, @RequestBody Map<String, Object> payload) {
        try {
            return ResponseEntity.ok(dsService.executeDsWorkflow(projectCode, processDefinitionCode, payload));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }
}
