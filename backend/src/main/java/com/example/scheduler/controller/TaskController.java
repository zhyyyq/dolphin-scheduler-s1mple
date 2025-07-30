package com.example.scheduler.controller;

import com.example.scheduler.service.DsService;
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
@RequestMapping("/api/task")
public class TaskController {

    @Autowired
    private DsService dsService;

    private static final Logger logger = LoggerFactory.getLogger(TaskController.class);

    @GetMapping("/instances")
    public ResponseEntity<?> getTaskInstances(
            @RequestParam(required = false) Long projectCode,
            @RequestParam(required = false) String startTime,
            @RequestParam(required = false) String endTime,
            @RequestParam(required = false) String stateType,
            @RequestParam(defaultValue = "1") int pageNo,
            @RequestParam(defaultValue = "100") int pageSize) {
        try {
            if (projectCode != null) {
                Map<String, Object> result = dsService.getTaskInstances(projectCode, stateType, pageNo, pageSize, startTime, endTime);
                return ResponseEntity.ok(result);
            } else {
                List<Map<String, Object>> allProjects = dsService.getProjects();
                List<Map<String, Object>> combinedInstances = new ArrayList<>();
                int totalCount = 0;

                for (Map<String, Object> project : allProjects) {
                    Long currentProjectCode = ((Number) project.get("code")).longValue();
                    try {
                        Map<String, Object> projectInstances = dsService.getTaskInstances(currentProjectCode, stateType, pageNo, pageSize, startTime, endTime);
                        if (projectInstances != null && projectInstances.containsKey("totalList")) {
                            combinedInstances.addAll((List<Map<String, Object>>) projectInstances.get("totalList"));
                            totalCount += ((Number) projectInstances.get("total")).intValue();
                        }
                    } catch (Exception e) {
                        logger.error("Error fetching task instances for project code: {}", currentProjectCode, e);
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
            logger.error("Error getting task instances", e);
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }
}
