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
        String workflowName = workflowDto.getName();
        String workflowUuid = workflowDto.getUuid();
        boolean isCreate = workflowUuid == null;

        if (isCreate) {
            // if (workflowRepository.findByName(workflowName).isPresent()) {
            //     throw new RuntimeException("A workflow with the name '" + workflowName + "' already exists.");
            // }
        } else {
            if (workflowRepository.findByNameAndUuidNot(workflowName, workflowUuid).isPresent()) {
                throw new RuntimeException("A workflow with the name '" + workflowName + "' already exists.");
            }
        }

        String commitMessage;
        if (isCreate) {
            workflowUuid = UUID.randomUUID().toString();
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
        
        // Ensure parent directory exists
        Path parentDir = filePath.getParent();
        if (!Files.exists(parentDir)) {
            Files.createDirectories(parentDir);
        }

        if (workflowDto.getOriginalFilename() != null && !workflowDto.getOriginalFilename().equals(filename)) {
            Path oldFilePath = Paths.get(workflowRepoDir, workflowDto.getOriginalFilename());
            if (Files.exists(oldFilePath)) {
                Files.delete(oldFilePath);
                commitMessage = "Migrate and update workflow " + workflowName + " to UUID-based storage";
            }
        }

        try (FileWriter writer = new FileWriter(filePath.toFile())) {
            writer.write(workflowDto.getContent());
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
        
        Map<String, Object> map = new java.util.HashMap<>();
        map.put("name", workflow.getName());
        map.put("uuid", workflow.getUuid());
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

    public void onlineWorkflow(String filename) throws Exception {
        String workflowUuid = filename.replace(".yaml", "");
        Workflow workflow = workflowRepository.findById(workflowUuid).orElseThrow(() -> new RuntimeException("Workflow not found"));
        dsService.submitWorkflowToDs(filename);

        gitService.gitCommit(filename, "Online workflow " + workflow.getName());
        String commitId = gitService.getLatestCommit(filename);

        Path filePath = Paths.get(workflowRepoDir, filename);
        String content = new String(Files.readAllBytes(filePath));
        String newContent = "# online-version: " + commitId + "\n" + content;
        Files.write(filePath, newContent.getBytes());
        gitService.gitCommit(filename, "Update online-version for " + workflow.getName());
    }

    public void deleteWorkflow(String workflowUuid, Long projectCode, Long workflowCode) throws Exception, GitAPIException {
        boolean deletedSomething = false;

        if (workflowUuid.startsWith("ds-")) {
            if (projectCode != null && workflowCode != null) {
                dsService.deleteDsWorkflow(projectCode, workflowCode);
                deletedSomething = true;
            }
        } else {
            if (workflowRepository.existsById(workflowUuid)) {
                Workflow workflow = workflowRepository.findById(workflowUuid).get();
                String filename = workflow.getUuid() + ".yaml";
                Path filePath = Paths.get(workflowRepoDir, filename);

                // Delete from DB
                workflowRepository.delete(workflow);

                // Safely delete file from repo and commit
                if (Files.exists(filePath)) {
                    gitService.gitRmAndCommit(filename, "Delete workflow: " + workflow.getName());
                }
                deletedSomething = true;
            }
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

        String projectCode = dsWorkflow.get("projectCode").toString();
        String workflowCode = dsWorkflow.get("code").toString();

        List<Map<String, Object>> environments = dsService.getEnvironments();
        Map<String, Object> defaultEnv = environments.stream()
                .filter(env -> "default".equals(env.get("name")))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("A 'default' environment was not found in DolphinScheduler. Please create one."));

        payload.put("environmentCode", defaultEnv.get("code"));

        return dsService.executeDsWorkflow(projectCode, workflowCode, payload);
    }

    public Map<String, Object> reparseWorkflow(WorkflowDto workflowDto) throws IOException {
        Yaml yaml = new Yaml();
        Map<String, Object> data = yaml.load(workflowDto.getContent());
        // Assuming a parseWorkflow equivalent exists or is not needed for now
        // Map<String, Object> parsedData = parseWorkflow(workflowDto.getContent());
        Map<String, Object> result = new java.util.HashMap<>();
        result.put("parsed", data);
        return result;
    }

    public List<Map<String, Object>> getWorkflowHistory(String workflowUuid) throws GitAPIException, IOException {
        String filename = workflowUuid + ".yaml";
        return gitService.getFileHistory(filename);
    }

    public Map<String, Object> getWorkflowAtCommit(String workflowUuid, String commitHash) throws GitAPIException, IOException {
        String filename = workflowUuid + ".yaml";
        return gitService.getCommitDiff(filename, commitHash);
    }

    public Map<String, Object> getFileAtCommit(String filename, String commitHash) throws GitAPIException, IOException {
        return gitService.getFileAtCommit(filename, commitHash);
    }

    public List<Map<String, Object>> getDeletedWorkflows() throws GitAPIException, IOException {
        return gitService.getDeletedFiles();
    }

    public void restoreWorkflow(String path, String commitHash) throws GitAPIException, IOException {
        gitService.restoreFileFromCommit(path, commitHash);
        String workflowUuid = path.replace(".yaml", "");
        Workflow workflow = new Workflow();
        workflow.setUuid(workflowUuid);
        
        Path filePath = Paths.get(workflowRepoDir, path);
        String content = new String(Files.readAllBytes(filePath));
        Yaml yaml = new Yaml();
        Map<String, Object> data = yaml.load(content);
        Map<String, Object> workflowMeta = (Map<String, Object>) data.get("workflow");
        if (workflowMeta != null) {
            workflow.setName((String) workflowMeta.get("name"));
        } else {
            workflow.setName(workflowUuid);
        }
        workflowRepository.save(workflow);
    }

    public void revertToCommit(String workflowUuid, String commitHash) throws GitAPIException, IOException {
        String filename = workflowUuid + ".yaml";
        gitService.revertFileToCommit(filename, commitHash);
    }
}
