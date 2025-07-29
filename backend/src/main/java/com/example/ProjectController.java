package com.example;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {

    @PostMapping
    public void createProject(@RequestBody Map<String, String> payload) {
        System.out.println("Project created: " + payload);
    }
}
