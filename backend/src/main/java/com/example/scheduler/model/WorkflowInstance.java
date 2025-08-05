// src/main/java/com/example/scheduler/entity/ProcessInstanceMarker.java
package com.example.scheduler.model;

import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.Table;

import lombok.Data;

@Data
@Entity
@Table(name = "t_ds_process_instance") // Maps to your existing table
public class WorkflowInstance {
    @Id
    private Long id; // Dummy field

    private String state;
    // Required no-arg constructor
    protected WorkflowInstance() {}
}