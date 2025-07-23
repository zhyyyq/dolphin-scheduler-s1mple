package com.example.scheduler.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    @GetMapping("/stats")
    public ResponseEntity<?> getDashboardStats() {
        Map<String, Integer> stats = new HashMap<>();
        stats.put("totalWorkflows", 10);
        stats.put("running", 2);
        stats.put("succeeded", 7);
        stats.put("failed", 1);
        return ResponseEntity.ok(stats);
    }
}
