package com.example.scheduler.controller;

import com.example.scheduler.model.TrackingEvent;
import com.example.scheduler.model.TrackingRun;
import com.example.scheduler.service.TrackingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tracking")
public class TrackingController {

    @Autowired
    private TrackingService trackingService;

    @PostMapping("/event")
    public void trackEvent(@RequestBody Map<String, Object> eventPayload) {
        trackingService.recordEvent(eventPayload);
    }

    @GetMapping("/runs")
    public List<TrackingRun> getRuns() {
        return trackingService.getAllRuns();
    }



    @GetMapping("/runs/{runId}/events")
    public List<TrackingEvent> getRunEvents(@PathVariable String runId) {
        return trackingService.getEventsForRun(runId);
    }
}
