package com.example.scheduler.model;

import lombok.Data;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.Table;

@Data
@Entity
@Table(name = "workflows")
public class Workflow {

    @Id
    private String uuid;

    private String name;

    private String onlineVersion;

    @Column(columnDefinition = "TEXT")
    private String locations;

    private Long projectCode;

    private String projectName;
}
