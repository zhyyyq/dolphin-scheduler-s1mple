package com.example.scheduler.service;

import com.example.scheduler.model.TrackingEvent;
import com.example.scheduler.model.TrackingRun;
import com.example.scheduler.repository.TrackingEventRepository;
import com.example.scheduler.repository.TrackingRunRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class TrackingService {

    @Autowired
    private TrackingEventRepository eventRepository;

    @Autowired
    private TrackingRunRepository runRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @Transactional
    public void recordEvent(Map<String, Object> eventPayload) {
        String runId = (String) eventPayload.get("runId");
        String functionName = (String) eventPayload.get("functionName");
        String workflowName = (String) eventPayload.get("workflowName"); // Get workflowName
        String eventName = (String) eventPayload.get("eventName");
        Object eventData = eventPayload.get("data");

        // Create or update the run
        Optional<TrackingRun> existingRun = runRepository.findByRunId(runId);
        TrackingRun run = existingRun.orElseGet(() -> {
            TrackingRun newRun = new TrackingRun();
            newRun.setRunId(runId);
            newRun.setFunctionName(functionName);
            newRun.setWorkflowName(workflowName); // Set workflowName
            newRun.setStartTime(Instant.now());
            newRun.setStatus("RUNNING");
            return newRun;
        });

        // Update status based on event name
        if ("end".equalsIgnoreCase(eventName)) {
            run.setStatus("SUCCESS");
        } else if ("error".equalsIgnoreCase(eventName)) {
            run.setStatus("FAILURE");
        }
        runRepository.save(run);

        // Create and save the event
        TrackingEvent event = new TrackingEvent();
        event.setRunId(runId);
        event.setFunctionName(functionName);
        event.setEventName(eventName);
        event.setTimestamp(Instant.now());
        try {
            event.setEventData(objectMapper.writeValueAsString(eventData));
        } catch (JsonProcessingException e) {
            // Handle exception, maybe log it and save a default value
            event.setEventData("{\"error\":\"Failed to serialize event data\"}");
        }
        eventRepository.save(event);
    }

    public List<TrackingRun> getAllRuns() {
        return runRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<TrackingEvent> getEventsForRun(String runId) {
        return eventRepository.findByRunId(runId);
    }
}
