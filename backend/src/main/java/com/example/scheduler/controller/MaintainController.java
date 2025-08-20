package com.example.scheduler.controller;

import com.alibaba.fastjson.JSONObject;
import com.example.scheduler.service.MaintainService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/maintain")
public class MaintainController {
    @Autowired
    private MaintainService maintainService;

    @GetMapping("/stats")
    public ResponseEntity<?> stats(@RequestParam(value = "projectCodes", required = false) Long[] projectCodes,
                                   @RequestParam(value = "timeType", required = false) String timeType,
                                   @RequestParam(value = "timeRange", required = false) String[] timeRange
    ) {
        try {
            JSONObject res = maintainService.getMaintenanceStatus(projectCodes, timeType, timeRange);
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }

    @GetMapping("/workflowDetail/{processDefinitionCode}")
    public ResponseEntity<?> workflowDetail(@PathVariable(value = "processDefinitionCode", required = false) Long processDefinitionCode
    ) {
        try {

            return ResponseEntity.ok(maintainService.getWorkflowDetails(processDefinitionCode));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }
}
