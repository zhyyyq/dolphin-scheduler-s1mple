package com.example.scheduler.model;

import lombok.Data;

@Data
public class Workflow {

    private String uuid;

    private String name;

    private String onlineVersion;

    private String locations;

    private Long projectCode;

    private String projectName;
}
