package com.example.scheduler.repository;

import com.example.scheduler.model.Workflow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface WorkflowRepository extends JpaRepository<Workflow, String> {
    Optional<Workflow> findByName(String name);
    Optional<Workflow> findByNameAndUuidNot(String name, String uuid);
}
