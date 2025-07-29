package com.example.scheduler.controller;

import com.example.scheduler.model.DiySchedulerFunction;
import com.example.scheduler.service.DiySchedulerFunctionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/diy-functions")
public class DiySchedulerFunctionController {

    @Autowired
    private DiySchedulerFunctionService service;

    @GetMapping
    public List<DiySchedulerFunction> getAllFunctions() {
        return service.getAllFunctions();
    }

    @GetMapping("/{id}")
    public ResponseEntity<DiySchedulerFunction> getFunctionById(@PathVariable Long id) {
        return service.getFunctionById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public DiySchedulerFunction createFunction(@RequestBody DiySchedulerFunction function) {
        return service.createFunction(function);
    }

    @PostMapping("/upload")
    public ResponseEntity<DiySchedulerFunction> uploadFunction(@RequestParam("file") MultipartFile file) {
        try {
            DiySchedulerFunction newFunction = service.createFunctionFromUpload(file);
            return ResponseEntity.ok(newFunction);
        } catch (IOException e) {
            return ResponseEntity.status(500).build();
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(null);
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<DiySchedulerFunction> updateFunction(@PathVariable Long id, @RequestBody DiySchedulerFunction functionDetails) {
        try {
            DiySchedulerFunction updatedFunction = service.updateFunction(id, functionDetails);
            return ResponseEntity.ok(updatedFunction);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteFunction(@PathVariable Long id) {
        try {
            service.deleteFunction(id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
