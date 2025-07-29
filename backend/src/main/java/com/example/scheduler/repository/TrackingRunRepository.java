package com.example.scheduler.repository;

import com.example.scheduler.model.TrackingRun;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface TrackingRunRepository extends JpaRepository<TrackingRun, Long> {
    Optional<TrackingRun> findByRunId(String runId);
}
