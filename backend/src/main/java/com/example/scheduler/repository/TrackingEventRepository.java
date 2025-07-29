package com.example.scheduler.repository;

import com.example.scheduler.model.TrackingEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TrackingEventRepository extends JpaRepository<TrackingEvent, Long> {
    List<TrackingEvent> findByRunId(String runId);
}
