package com.example.scheduler.service;

import com.example.scheduler.model.DiySchedulerFunction;
import com.example.scheduler.mapper.DiySchedulerFunctionMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.apache.commons.io.FilenameUtils;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Optional;

@Service
public class DiySchedulerFunctionService {

    @Autowired
    private DiySchedulerFunctionMapper mapper;

    public List<DiySchedulerFunction> getAllFunctions() {
        return mapper.findAllByDeletedFalse();
    }

    public Optional<DiySchedulerFunction> getFunctionById(Long id) {
        return mapper.findByIdAndDeletedFalse(id);
    }

    public DiySchedulerFunction createFunction(DiySchedulerFunction function) {
        // Check for duplicates before creating
        if (mapper.findByFunctionNameAndDeletedFalse(function.getFunctionName()).isPresent()) {
            throw new RuntimeException("Function with name '" + function.getFunctionName() + "' already exists.");
        }
        if (function.getFunctionContent() != null) {
            function.setContentHash(String.valueOf(function.getFunctionContent().hashCode()));
        }
        mapper.save(function);
        return function;
    }

    public DiySchedulerFunction createFunctionFromUpload(MultipartFile file) throws IOException {
        String originalFilename = file.getOriginalFilename();
        String baseName = FilenameUtils.getBaseName(originalFilename);
        String content = new String(file.getBytes(), StandardCharsets.UTF_8);

        Optional<DiySchedulerFunction> existingFunctionOpt = mapper.findByFunctionName(baseName);

        if (existingFunctionOpt.isPresent()) {
            // If a function with the same name exists (regardless of deleted status), update it.
            DiySchedulerFunction existingFunction = existingFunctionOpt.get();
            existingFunction.setFunctionContent(content);
            existingFunction.setContentHash(String.valueOf(content.hashCode()));
            existingFunction.setDeleted(false); // Undelete it if it was deleted
            mapper.update(existingFunction);
            return existingFunction;
        } else {
            // If no function with this name has ever existed, create a new one.
            DiySchedulerFunction newFunction = new DiySchedulerFunction();
            newFunction.setFunctionName(baseName);
            newFunction.setFunctionContent(content);
            newFunction.setContentHash(String.valueOf(content.hashCode()));
            newFunction.setDeleted(false);
            mapper.save(newFunction);
            return newFunction;
        }
    }

    public DiySchedulerFunction updateFunction(Long id, DiySchedulerFunction functionDetails) {
        DiySchedulerFunction function = mapper.findById(id)
                .orElseThrow(() -> new RuntimeException("Function not found with id: " + id));

        function.setFunctionName(functionDetails.getFunctionName());
        function.setFunctionContent(functionDetails.getFunctionContent());
        if (functionDetails.getFunctionContent() != null) {
            function.setContentHash(String.valueOf(functionDetails.getFunctionContent().hashCode()));
        }
        
        mapper.update(function);
        return function;
    }

    public void deleteFunction(Long id) {
        DiySchedulerFunction function = mapper.findById(id)
                .orElseThrow(() -> new RuntimeException("Function not found with id: " + id));
        function.setDeleted(true);
        mapper.update(function);
    }
}
