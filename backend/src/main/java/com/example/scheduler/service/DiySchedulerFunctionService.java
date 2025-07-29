package com.example.scheduler.service;

import com.example.scheduler.model.DiySchedulerFunction;
import com.example.scheduler.repository.DiySchedulerFunctionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.apache.commons.io.FilenameUtils;

import java.io.IOException;
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
        // Check for duplicates before creating
        if (repository.findByFunctionName(function.getFunctionName()).isPresent()) {
            throw new RuntimeException("Function with name '" + function.getFunctionName() + "' already exists.");
        }
        return repository.save(function);
    }

    public DiySchedulerFunction createFunctionFromUpload(MultipartFile file) throws IOException {
        String originalFilename = file.getOriginalFilename();
        String baseName = FilenameUtils.getBaseName(originalFilename);
        String content = new String(file.getBytes());

        String finalName = baseName;
        int counter = 1;
        while (repository.findByFunctionName(finalName).isPresent()) {
            finalName = baseName + "_" + counter;
            counter++;
        }

        DiySchedulerFunction newFunction = new DiySchedulerFunction();
        newFunction.setFunctionName(finalName);
        newFunction.setFunctionContent(content);

        return repository.save(newFunction);
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
