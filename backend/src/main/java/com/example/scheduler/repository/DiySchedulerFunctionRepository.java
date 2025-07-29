package com.example.scheduler.repository;

import com.example.scheduler.model.DiySchedulerFunction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DiySchedulerFunctionRepository extends JpaRepository<DiySchedulerFunction, Long> {
    Optional<DiySchedulerFunction> findByFunctionName(String functionName);
}
