package com.example.scheduler.controller;

import com.example.scheduler.service.DsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {

    @Autowired
    private DsService dsService;

    @PostMapping
    public void createProject(@RequestBody Map<String, String> payload) throws Exception {
        dsService.createProject(
            payload.get("name"),
            payload.get("description"),
            payload.get("owner")
        );
    }
}
