package com.example.scheduler.dto;

import lombok.Data;

@Data
public class WorkflowDto {
    private String name;
    private String content;
    private String originalFilename;
    private String uuid;
    private String locations;
}
