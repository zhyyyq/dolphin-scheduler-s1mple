package com.example.scheduler.service;

import com.example.scheduler.model.DiySchedulerFunction;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.example.scheduler.mapper.DiySchedulerFunctionMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.apache.commons.io.FilenameUtils;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Service
public class DiySchedulerFunctionService {

    @Autowired
    private DiySchedulerFunctionMapper diySchedulerFunctionMapper;

    public List<DiySchedulerFunction> getAllFunctions() {
        return  diySchedulerFunctionMapper.selectList(new QueryWrapper<DiySchedulerFunction>().eq("deleted", false).orderByAsc("function_id"));
    }

    public DiySchedulerFunction getFunctionById(Long id) {
        return diySchedulerFunctionMapper.selectOne(new QueryWrapper<DiySchedulerFunction>().eq("deleted", false).eq("function_id", id));
    }

    public DiySchedulerFunction createFunction(DiySchedulerFunction function) {
        // Check for duplicates before creating
        if (diySchedulerFunctionMapper.exists(new QueryWrapper<DiySchedulerFunction>().eq("function_name", function.getFunctionName()))) {
            throw new RuntimeException("Function with name '" + function.getFunctionName() + "' already exists.");
        }
        if (function.getFunctionContent() != null) {
          function.setContentHash(String.valueOf(function.getFunctionContent().hashCode()));
        }
        diySchedulerFunctionMapper.insert(function);
        return function;
    }

    public DiySchedulerFunction createFunctionFromUpload(MultipartFile file) throws IOException {
        String originalFilename = file.getOriginalFilename();
        String baseName = FilenameUtils.getBaseName(originalFilename);
        String content = new String(file.getBytes(), StandardCharsets.UTF_8);


        if (diySchedulerFunctionMapper.exists(new QueryWrapper<DiySchedulerFunction>().eq("function_name", baseName))) {
            throw new RuntimeException("Function with name '" + baseName + "' already exists.");
        } else {
            // If no function with this name has ever existed, create a new one.
            DiySchedulerFunction newFunction = new DiySchedulerFunction();
            newFunction.setFunctionName(baseName);
            newFunction.setFunctionContent(content);
            newFunction.setContentHash(String.valueOf(content.hashCode()));
            newFunction.setDeleted(false);
            diySchedulerFunctionMapper.insert(newFunction);
            return newFunction;
        }
    }

    public DiySchedulerFunction updateFunction(Long id, DiySchedulerFunction functionDetails) {
        DiySchedulerFunction curFunction = diySchedulerFunctionMapper.selectById(id);
        if (curFunction == null) {
            throw new RuntimeException("Function with id '" + id + "' not exists.");
        }
        curFunction.setFunctionName(functionDetails.getFunctionName());
        curFunction.setFunctionContent(functionDetails.getFunctionContent());
        if (functionDetails.getFunctionContent() != null) {
            curFunction.setContentHash(String.valueOf(functionDetails.getFunctionContent().hashCode()));
        }
        
        diySchedulerFunctionMapper.updateById(curFunction);
        return curFunction;
    }

    public void deleteFunction(Long id) {
        DiySchedulerFunction function = diySchedulerFunctionMapper.selectById(id);
        if (function == null) {
            throw new RuntimeException("Function with id '" + id + "' not exists.");
        }
        function.setDeleted(true);
        diySchedulerFunctionMapper.updateById(function);
    }
}
