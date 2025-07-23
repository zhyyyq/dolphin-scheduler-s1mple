package com.example.scheduler.service;

import com.example.scheduler.dto.WorkflowDto;
import com.example.scheduler.model.Workflow;
import com.example.scheduler.repository.WorkflowRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.yaml.snakeyaml.Yaml;

import java.io.FileWriter;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class WorkflowService {

    @Autowired
    private WorkflowRepository workflowRepository;

    @Autowired
    private DsService dsService;

    @Value("${workflow.repo.dir}")
    private String workflowRepoDir;

    public Map<String, String> saveWorkflowYaml(WorkflowDto workflowDto) throws IOException {
        Yaml yaml = new Yaml();
        Map<String, Object> data = yaml.load(workflowDto.getContent());
        Map<String, Object> workflowMeta = (Map<String, Object>) data.get("workflow");
        String workflowName = (String) workflowMeta.get("name");
        String workflowUuid = (String) workflowMeta.get("uuid");
        boolean isCreate = workflowUuid == null;

        if (isCreate) {
            if (workflowRepository.findByName(workflowName).isPresent()) {
                throw new RuntimeException("A workflow with the name '" + workflowName + "' already exists.");
            }
            workflowUuid = UUID.randomUUID().toString();
            workflowMeta.put("uuid", workflowUuid);
            Workflow newWorkflow = new Workflow();
            newWorkflow.setUuid(workflowUuid);
            newWorkflow.setName(workflowName);
            workflowRepository.save(newWorkflow);
        } else {
            Workflow dbWorkflow = workflowRepository.findById(workflowUuid).orElseThrow(() -> new RuntimeException("Workflow not found"));
            dbWorkflow.setName(workflowName);
            workflowRepository.save(dbWorkflow);
        }

        String filename = workflowUuid + ".yaml";
        Path filePath = Paths.get(workflowRepoDir, filename);
        try (FileWriter writer = new FileWriter(filePath.toFile())) {
            yaml.dump(data, writer);
        }

        Map<String, String> result = new java.util.HashMap<>();
        result.put("filename", filename);
        result.put("uuid", workflowUuid);
        return result;
    }

    public List<Map<String, Object>> getLocalWorkflows() {
        return workflowRepository.findAll().stream()
                .map(workflow -> {
                    Map<String, Object> map = new java.util.HashMap<>();
                    map.put("name", workflow.getName());
                    map.put("uuid", workflow.getUuid());
                    map.put("projectName", "Local File");
                    map.put("releaseState", "OFFLINE");
                    // ... add other fields as needed
                    return map;
                })
                .collect(Collectors.toList());
    }

    public Map<String, Object> getWorkflowDetails(String workflowUuid) throws IOException {
        Workflow workflow = workflowRepository.findById(workflowUuid).orElseThrow(() -> new RuntimeException("Workflow not found"));
        String filename = workflowUuid + ".yaml";
        Path filePath = Paths.get(workflowRepoDir, filename);
        String content = new String(Files.readAllBytes(filePath));
        Map<String, Object> map = new java.util.HashMap<>();
        map.put("name", workflow.getName());
        map.put("uuid", workflow.getUuid());
        map.put("yaml_content", content);
        // ... parse yaml and add other fields
        return map;
    }

    public List<Map<String, Object>> getCombinedWorkflows() throws Exception {
        List<Map<String, Object>> dsWorkflows = dsService.getWorkflows();
        List<Map<String, Object>> localWorkflows = getLocalWorkflows();
        // ... combine logic
        return dsWorkflows;
    }

    public void onlineWorkflow(String workflowUuid) {
        // ... submit to ds
    }

    public void deleteWorkflow(String workflowUuid, Long projectCode, Long workflowCode) throws Exception {
        if (projectCode != null && workflowCode != null) {
            dsService.deleteDsWorkflow(projectCode, workflowCode);
        }
        workflowRepository.deleteById(workflowUuid);
        Path filePath = Paths.get(workflowRepoDir, workflowUuid + ".yaml");
        Files.deleteIfExists(filePath);
    }
}
