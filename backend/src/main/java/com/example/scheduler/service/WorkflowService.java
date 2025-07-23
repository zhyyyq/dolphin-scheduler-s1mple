package com.example.scheduler.service;

import com.example.scheduler.dto.WorkflowDto;
import com.example.scheduler.model.Workflow;
import com.example.scheduler.repository.WorkflowRepository;
import org.eclipse.jgit.api.errors.GitAPIException;
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

    @Autowired
    private GitService gitService;

    @Value("${workflow.repo.dir}")
    private String workflowRepoDir;

    public Map<String, String> saveWorkflowYaml(WorkflowDto workflowDto) throws IOException, GitAPIException {
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

        gitService.gitCommit(filename, "Save workflow " + workflowName);

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

        Map<String, Map<String, Object>> localWorkflowsMap = localWorkflows.stream()
                .collect(Collectors.toMap(wf -> (String) wf.get("name"), wf -> wf));
        Map<String, Map<String, Object>> dsWorkflowsMap = dsWorkflows.stream()
                .collect(Collectors.toMap(wf -> (String) wf.get("name"), wf -> wf));

        List<Map<String, Object>> combinedWorkflows = new java.util.ArrayList<>();
        java.util.Set<String> allWorkflowNames = new java.util.HashSet<>();
        allWorkflowNames.addAll(localWorkflowsMap.keySet());
        allWorkflowNames.addAll(dsWorkflowsMap.keySet());

        for (String name : allWorkflowNames) {
            Map<String, Object> localWf = localWorkflowsMap.get(name);
            Map<String, Object> dsWf = dsWorkflowsMap.get(name);
            Map<String, Object> combinedWf = new java.util.HashMap<>();

            if (dsWf != null && localWf != null) {
                combinedWf.putAll(dsWf);
                combinedWf.putAll(localWf);
                combinedWf.put("isLocal", true);
            } else if (dsWf != null) {
                combinedWf.putAll(dsWf);
                combinedWf.put("isLocal", false);
            } else {
                combinedWf.putAll(localWf);
                combinedWf.put("releaseState", "UNSUBMITTED");
                combinedWf.put("isLocal", true);
            }
            combinedWorkflows.add(combinedWf);
        }
        return combinedWorkflows;
    }

    public void onlineWorkflow(String workflowUuid) throws Exception {
        Workflow workflow = workflowRepository.findById(workflowUuid).orElseThrow(() -> new RuntimeException("Workflow not found"));
        String filename = workflow.getUuid() + ".yaml";
        dsService.submitWorkflowToDs(filename);
    }

    public void deleteWorkflow(String workflowUuid, Long projectCode, Long workflowCode) throws Exception, GitAPIException {
        boolean deletedSomething = false;

        // 1. Attempt to delete from DolphinScheduler if codes are provided
        if (projectCode != null && workflowCode != null) {
            dsService.deleteDsWorkflow(projectCode, workflowCode);
            deletedSomething = true;
        }

        // 2. Attempt to delete locally if a DB entry exists for the UUID
        if (workflowRepository.existsById(workflowUuid)) {
            Workflow workflow = workflowRepository.findById(workflowUuid).get();
            String filename = workflow.getUuid() + ".yaml";
            Path filePath = Paths.get(workflowRepoDir, filename);

            // Delete from DB
            workflowRepository.delete(workflow);

            // Safely delete file from repo and commit
            if (Files.exists(filePath)) {
                Files.delete(filePath);
                gitService.gitCommit(filename, "Delete workflow: " + filename);
            }
            deletedSomething = true;
        }

        if (!deletedSomething) {
            throw new RuntimeException("Workflow with UUID " + workflowUuid + " not found.");
        }
    }
}
