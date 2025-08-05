package com.example.scheduler.model;

import lombok.Data;

@Data
public class DiySchedulerFunction {

    private Long functionId;

    private String functionName;

    private String functionContent;

    private boolean deleted = false;

    private String contentHash;
}
