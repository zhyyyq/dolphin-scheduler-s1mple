package com.example.scheduler.repository;

import com.example.scheduler.model.DiySchedulerFunction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DiySchedulerFunctionRepository extends JpaRepository<DiySchedulerFunction, Long> {
    Optional<DiySchedulerFunction> findByFunctionNameAndDeletedFalse(String functionName);
    Optional<DiySchedulerFunction> findByFunctionName(String functionName); // Find by name regardless of deleted status
    List<DiySchedulerFunction> findAllByDeletedFalse();
    
    @Query("SELECT f FROM DiySchedulerFunction f WHERE f.functionId = :functionId AND f.deleted = false")
    Optional<DiySchedulerFunction> findByIdAndDeletedFalse(@Param("functionId") Long functionId);
}
