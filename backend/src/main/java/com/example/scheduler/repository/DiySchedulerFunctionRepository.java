package com.example.scheduler.repository;

import com.example.scheduler.model.DiySchedulerFunction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DiySchedulerFunctionRepository extends JpaRepository<DiySchedulerFunction, Long> {
}
