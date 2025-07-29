package com.example.scheduler.controller;

import com.example.scheduler.service.DsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

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

    @GetMapping
    public List<Map<String, Object>> getProjects() throws Exception {
        return dsService.getProjects();
    }

    @DeleteMapping("/{projectCode}")
    public void deleteProject(@PathVariable Long projectCode) throws Exception {
        dsService.deleteProject(projectCode);
    }
}
