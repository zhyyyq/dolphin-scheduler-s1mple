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

        if (!data.containsKey("workflow")) {
            data.put("workflow", new java.util.HashMap<>());
        }

        Map<String, Object> workflowMeta = (Map<String, Object>) data.get("workflow");
        String workflowName = (String) workflowMeta.get("name");
        String workflowUuid = (String) workflowMeta.get("uuid");
        boolean isCreate = workflowUuid == null;

        if (isCreate) {
            if (workflowRepository.findByName(workflowName).isPresent()) {
                throw new RuntimeException("A workflow with the name '" + workflowName + "' already exists.");
            }
        } else {
            if (workflowRepository.findByNameAndUuidNot(workflowName, workflowUuid).isPresent()) {
                throw new RuntimeException("A workflow with the name '" + workflowName + "' already exists.");
            }
        }

        String commitMessage;
        if (isCreate) {
            workflowUuid = UUID.randomUUID().toString();
            workflowMeta.put("uuid", workflowUuid);
            commitMessage = "Create workflow " + workflowName;
            Workflow newWorkflow = new Workflow();
            newWorkflow.setUuid(workflowUuid);
            newWorkflow.setName(workflowName);
            workflowRepository.save(newWorkflow);
        } else {
            commitMessage = "Update workflow " + workflowName;
            Workflow dbWorkflow = workflowRepository.findById(workflowUuid).orElseThrow(() -> new RuntimeException("Workflow not found"));
            dbWorkflow.setName(workflowName);
            workflowRepository.save(dbWorkflow);
        }

        String filename = workflowUuid + ".yaml";
        Path filePath = Paths.get(workflowRepoDir, filename);

        if (workflowDto.getOriginalFilename() != null && !workflowDto.getOriginalFilename().equals(filename)) {
            Path oldFilePath = Paths.get(workflowRepoDir, workflowDto.getOriginalFilename());
            if (Files.exists(oldFilePath)) {
                Files.delete(oldFilePath);
                commitMessage = "Migrate and update workflow " + workflowName + " to UUID-based storage";
            }
        }

        if (!isCreate) {
            workflowMeta.put("local_status", "modified");
        } else {
            workflowMeta.put("local_status", "new");
        }

        try (FileWriter writer = new FileWriter(filePath.toFile())) {
            yaml.dump(data, writer);
        }

        gitService.gitCommit(filename, commitMessage);

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

                    String filename = workflow.getUuid() + ".yaml";
                    Path filePath = Paths.get(workflowRepoDir, filename);
                    if (Files.exists(filePath)) {
                        try {
                            map.put("updateTime", Files.getLastModifiedTime(filePath).toMillis());
                            Yaml yaml = new Yaml();
                            Map<String, Object> data = yaml.load(new String(Files.readAllBytes(filePath)));
                            Map<String, Object> workflowMeta = (Map<String, Object>) data.get("workflow");
                            if (workflowMeta != null) {
                                map.put("schedule", workflowMeta.get("schedule"));
                                map.put("local_status", workflowMeta.getOrDefault("local_status", "synced"));
                            }
                        } catch (IOException e) {
                            // Log the error
                        }
                    }
                    map.put("code", filename);
                    map.put("isLocal", true);
                    return map;
                })
                .collect(Collectors.toList());
    }

    public Map<String, Object> getWorkflowDetails(String workflowUuid) throws IOException {
        Workflow workflow = workflowRepository.findById(workflowUuid).orElseThrow(() -> new RuntimeException("Workflow not found in database."));
        String filename = workflowUuid + ".yaml";
        Path filePath = Paths.get(workflowRepoDir, filename);
        if (!Files.exists(filePath)) {
            throw new RuntimeException("Workflow file not found, though a DB record exists.");
        }
        String content = new String(Files.readAllBytes(filePath));
        
        Yaml yaml = new Yaml();
        Map<String, Object> rawData = yaml.load(content);
        // Assuming a parseWorkflow equivalent exists or is not needed for now
        // Map<String, Object> parsedData = parseWorkflow(content);

        Map<String, Object> workflowMeta = (Map<String, Object>) rawData.get("workflow");

        Map<String, Object> map = new java.util.HashMap<>();
        map.put("name", workflow.getName());
        map.put("uuid", workflow.getUuid());
        map.put("schedule", workflowMeta.get("schedule"));
        // map.put("tasks", parsedData.get("tasks"));
        // map.put("relations", parsedData.get("relations"));
        map.put("filename", filename);
        map.put("yaml_content", content);
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
                combinedWf.putAll(localWf);
                combinedWf.putAll(dsWf);
                combinedWf.put("uuid", localWf.get("uuid"));
                combinedWf.put("isLocal", true);
            } else if (dsWf != null) {
                combinedWf.putAll(dsWf);
                combinedWf.put("isLocal", false);
                combinedWf.put("uuid", "ds-" + dsWf.get("projectCode") + "-" + dsWf.get("code"));
            } else {
                combinedWf.putAll(localWf);
                combinedWf.put("releaseState", "UNSUBMITTED");
                combinedWf.put("isLocal", true);
            }

            // Standardize schedule display text
            String scheduleText = null;
            String scheduleHumanReadable = null;
            Object scheduleObj = combinedWf.get("schedule");
            if (scheduleObj != null) {
                if (scheduleObj instanceof Map) {
                    scheduleText = (String) ((Map) scheduleObj).get("crontab");
                } else {
                    scheduleText = scheduleObj.toString();
                }

                if (scheduleText != null) {
                    // Add cron-descriptor logic here if needed
                    scheduleHumanReadable = scheduleText;
                }
            }
            combinedWf.put("schedule_text", scheduleText);
            combinedWf.put("schedule_human_readable", scheduleHumanReadable);
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

    public Map<String, Object> executeWorkflow(String workflowUuid, Map<String, Object> payload) throws Exception {
        Workflow workflow = workflowRepository.findById(workflowUuid).orElseThrow(() -> new RuntimeException("Workflow not found in database."));

        List<Map<String, Object>> dsWorkflows = dsService.getWorkflows();
        Map<String, Object> dsWorkflow = dsWorkflows.stream()
                .filter(wf -> wf.get("name").equals(workflow.getName()))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Could not find a corresponding online workflow in DolphinScheduler."));

        Long projectCode = ((Number) dsWorkflow.get("projectCode")).longValue();
        Long workflowCode = ((Number) dsWorkflow.get("code")).longValue();

        List<Map<String, Object>> environments = dsService.getEnvironments();
        Map<String, Object> defaultEnv = environments.stream()
                .filter(env -> "default".equals(env.get("name")))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("A 'default' environment was not found in DolphinScheduler. Please create one."));

        payload.put("environmentCode", defaultEnv.get("code"));

        return dsService.executeDsWorkflow(projectCode, workflowCode, payload);
    }
}
