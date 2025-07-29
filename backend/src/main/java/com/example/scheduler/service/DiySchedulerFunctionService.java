package com.example.scheduler.service;

import com.example.scheduler.model.DiySchedulerFunction;
import com.example.scheduler.repository.DiySchedulerFunctionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class DiySchedulerFunctionService {

    @Autowired
    private DiySchedulerFunctionRepository repository;

    public List<DiySchedulerFunction> getAllFunctions() {
        return repository.findAll();
    }

    public Optional<DiySchedulerFunction> getFunctionById(Long id) {
        return repository.findById(id);
    }

    public DiySchedulerFunction createFunction(DiySchedulerFunction function) {
        return repository.save(function);
    }

    public DiySchedulerFunction updateFunction(Long id, DiySchedulerFunction functionDetails) {
        DiySchedulerFunction function = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Function not found with id: " + id));

        function.setFunctionName(functionDetails.getFunctionName());
        function.setFunctionContent(functionDetails.getFunctionContent());
        
        return repository.save(function);
    }

    public void deleteFunction(Long id) {
        DiySchedulerFunction function = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Function not found with id: " + id));
        repository.delete(function);
    }
}
