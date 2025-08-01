package com.example.scheduler.controller;

import com.example.scheduler.dto.WorkflowDto;
import com.example.scheduler.service.WorkflowService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/workflow")
public class WorkflowController {

    @Autowired
    private WorkflowService workflowService;

    @Autowired
    private com.example.scheduler.service.DsService dsService;

    private static final Logger logger = LoggerFactory.getLogger(WorkflowController.class);

    @PostMapping("/yaml")
    public ResponseEntity<?> saveWorkflowYaml(@RequestBody WorkflowDto workflowDto) {
        try {
            return ResponseEntity.ok(workflowService.saveWorkflowYaml(workflowDto));
        } catch (Exception e) {
            logger.error("Error saving workflow yaml", e);
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }

    @GetMapping("/local")
    public ResponseEntity<?> getLocalWorkflows() {
        try {
            return ResponseEntity.ok(workflowService.getLocalWorkflows());
        } catch (Exception e) {
            logger.error("Error getting local workflows", e);
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }

    @GetMapping("/{workflowUuid}")
    public ResponseEntity<?> getWorkflowDetails(@PathVariable String workflowUuid) {
        try {
            return ResponseEntity.ok(workflowService.getWorkflowDetails(workflowUuid));
        } catch (Exception e) {
            logger.error("Error getting workflow details for {}", workflowUuid, e);
            return ResponseEntity.status(404).body(e.getMessage());
        }
    }

    @GetMapping("/combined")
    public ResponseEntity<?> getCombinedWorkflows() {
        try {
            return ResponseEntity.ok(workflowService.getCombinedWorkflows());
        } catch (Exception e) {
            logger.error("Error getting combined workflows", e);
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }

    @PostMapping("/{workflowUuid}/online")
    public ResponseEntity<?> onlineWorkflow(@PathVariable String workflowUuid) {
        try {
            workflowService.onlineWorkflow(workflowUuid);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            logger.error("Error onlining workflow {}", workflowUuid, e);
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }

    @DeleteMapping("/{workflowUuid}")
    public ResponseEntity<?> deleteWorkflow(@PathVariable String workflowUuid,
                                             @RequestParam(required = false) Long projectCode,
                                             @RequestParam(required = false) Long workflowCode) {
        try {
            if (workflowUuid.startsWith("ds-")) {
                String[] parts = workflowUuid.split("-");
                projectCode = Long.parseLong(parts[1]);
                workflowCode = Long.parseLong(parts[2]);
            }
            workflowService.deleteWorkflow(workflowUuid, projectCode, workflowCode);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            logger.error("Error deleting workflow {}", workflowUuid, e);
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }

    @GetMapping("/deleted")
    public ResponseEntity<?> getDeletedWorkflows() {
        try {
            return ResponseEntity.ok(workflowService.getDeletedWorkflows());
        } catch (Exception e) {
            logger.error("Error getting deleted workflows", e);
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }

    @PostMapping("/{workflowUuid}/execute")
    public ResponseEntity<?> executeWorkflow(@PathVariable String workflowUuid, @RequestBody Map<String, Object> payload) {
        try {
            return ResponseEntity.ok(workflowService.executeWorkflow(workflowUuid, payload));
        } catch (Exception e) {
            logger.error("Error executing workflow {}", workflowUuid, e);
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }

    @PostMapping("/reparse")
    public ResponseEntity<?> reparseWorkflow(@RequestBody WorkflowDto workflowDto) {
        try {
            return ResponseEntity.ok(workflowService.reparseWorkflow(workflowDto));
        } catch (Exception e) {
            logger.error("Error reparsing workflow", e);
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }

    @GetMapping("/{workflowUuid}/history")
    public ResponseEntity<?> getWorkflowHistory(@PathVariable String workflowUuid) {
        try {
            return ResponseEntity.ok(workflowService.getWorkflowHistory(workflowUuid));
        } catch (Exception e) {
            logger.error("Error getting workflow history for {}", workflowUuid, e);
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }

    @GetMapping("/{workflowUuid}/commit/{commitHash}")
    public ResponseEntity<?> getWorkflowAtCommit(@PathVariable String workflowUuid, @PathVariable String commitHash) {
        try {
            return ResponseEntity.ok(workflowService.getWorkflowAtCommit(workflowUuid, commitHash));
        } catch (Exception e) {
            logger.error("Error getting workflow at commit {} for {}", commitHash, workflowUuid, e);
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }

    @PostMapping("/restore")
    public ResponseEntity<?> restoreWorkflow(@RequestBody Map<String, String> payload) {
        try {
            String path = payload.get("path");
            String commitHash = payload.get("commit");
            workflowService.restoreWorkflow(path, commitHash);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            logger.error("Error restoring workflow", e);
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }

    @GetMapping("/content/{commitHash}/{filename}")
    public ResponseEntity<?> getWorkflowContentAtCommit(@PathVariable String commitHash, @PathVariable String filename) {
        try {
            return ResponseEntity.ok(workflowService.getFileAtCommit(filename, commitHash));
        } catch (Exception e) {
            logger.error("Error getting workflow content at commit {} for {}", commitHash, filename, e);
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }

    @PostMapping("/revert")
    public ResponseEntity<?> revertWorkflow(@RequestBody Map<String, String> payload) {
        try {
            String workflowUuid = payload.get("workflow_uuid");
            String commitHash = payload.get("commit_hash");
            workflowService.revertToCommit(workflowUuid, commitHash);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            logger.error("Error reverting workflow", e);
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }

    @PostMapping("/ds")
    public ResponseEntity<?> createOrUpdateDsWorkflow(@RequestBody Map<String, Object> payload) {
        try {
            Map<String, Object> result = workflowService.createOrUpdateDsWorkflow(payload);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            logger.error("Error creating or updating DS workflow", e);
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }

    @GetMapping("/instances")
    public ResponseEntity<?> getWorkflowInstances(
            @RequestParam(required = false) Long projectCode,
            @RequestParam(required = false) String startTime,
            @RequestParam(required = false) String endTime,
            @RequestParam(required = false) String stateType,
            @RequestParam(defaultValue = "1") int pageNo,
            @RequestParam(defaultValue = "100") int pageSize) {
        try {
            if (projectCode != null) {
                Map<String, Object> result = dsService.getWorkflowInstances(projectCode, stateType, pageNo, pageSize, startTime, endTime);
                return ResponseEntity.ok(result);
            } else {
                List<Map<String, Object>> allProjects = dsService.getProjects();
                List<Map<String, Object>> combinedInstances = new ArrayList<>();
                int totalCount = 0;

                for (Map<String, Object> project : allProjects) {
                    Long currentProjectCode = ((Number) project.get("code")).longValue();
                    try {
                        Map<String, Object> projectInstances = dsService.getWorkflowInstances(currentProjectCode, stateType, pageNo, pageSize, startTime, endTime);
                        if (projectInstances != null && projectInstances.containsKey("totalList")) {
                            combinedInstances.addAll((List<Map<String, Object>>) projectInstances.get("totalList"));
                            totalCount += ((Number) projectInstances.get("total")).intValue();
                        }
                    } catch (Exception e) {
                        logger.error("Error fetching instances for project code: {}", currentProjectCode, e);
                        // Continue to next project
                    }
                }

                Map<String, Object> finalResult = new HashMap<>();
                finalResult.put("totalList", combinedInstances);
                finalResult.put("total", totalCount);
                finalResult.put("currentPage", pageNo);
                finalResult.put("pageSize", pageSize);
                return ResponseEntity.ok(finalResult);
            }
        } catch (Exception e) {
            logger.error("Error getting workflow instances", e);
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }
}
