package com.example.scheduler.service;

import com.alibaba.fastjson.JSONObject;
import com.example.scheduler.dto.WorkflowDto;
import com.example.scheduler.mapper.DiyWorkflowMapper;
import com.example.scheduler.model.DiyWorkflow;
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
import java.util.stream.Collectors;

@Service
public class WorkflowService {

    @Autowired
    private DiyWorkflowMapper diyWorkflowMapper;
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

        String commitMessage;
        if (isCreate) {
            // 创建新的工作流
            commitMessage = "Create workflow " + workflowName;
            DiyWorkflow newDiyWorkflow = new DiyWorkflow();
            this.diyWorkflowMapper.insert(newDiyWorkflow);
            workflowUuid = newDiyWorkflow.getId();
        } else {
            commitMessage = "update workflow " + workflowName;
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
        return diyWorkflowMapper.selectList(null).stream()
                .map(workflow -> {
                    Map<String, Object> map = new java.util.HashMap<>();
                    JSONObject workflowJSON = (JSONObject) JSONObject.toJSON(workflow);
                    map.putAll(workflowJSON);
                    String filename = workflow.getId() + ".yaml";
                    Path filePath = Paths.get(workflowRepoDir, filename);
                    if (Files.exists(filePath)) {
                        try {
                            long lastModifiedMillis = Files.getLastModifiedTime(filePath).toMillis();
                            map.put("updateTime",
                                    new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new java.util.Date(lastModifiedMillis)));

                            String content = new String(Files.readAllBytes(filePath));
                            Yaml yaml = new Yaml();
                            Map<String, Object> data = yaml.load(content);
                            if (data != null) {
                                map.put("yaml_content", data);
                            }
                        } catch (IOException e) {
                            // Log the error
                        }
                    }
                    return map;
                })
                .collect(Collectors.toList());
    }

    public Map<String, Object> getWorkflowDetails(String workflowUuid) throws IOException {
        DiyWorkflow workflow = diyWorkflowMapper.selectById(workflowUuid);

        String filename = workflowUuid + ".yaml";
        Path filePath = Paths.get(workflowRepoDir, filename);
        if (!Files.exists(filePath)) {
            throw new RuntimeException("Workflow file not found, though a DB record exists.");
        }
        String content = new String(Files.readAllBytes(filePath));
        Yaml yaml = new Yaml();
        Map<String, Object> data = yaml.load(content);
        Map<String, Object> map = new java.util.HashMap<>();
        map.put("uuid", workflow.getId());
        map.put("filename", filename);
        map.put("yaml_content", data);
        map.put("yaml_content_raw", content);
        return map;
    }

    public JSONObject getCombinedWorkflows() throws Exception {
        List<Map<String, Object>> dsWorkflows = dsService.getWorkflows();
        List<Map<String, Object>> localWorkflows = getLocalWorkflows();
        JSONObject res = new JSONObject();
        res.put("dsWorkflows", dsWorkflows);
        res.put("localWorkflows", localWorkflows);

        return res;
    }


    public Map<String, Object> createOrUpdateDsWorkflow(Map<String, Object> payload) throws Exception {
        // First, call the DS service to create or update the workflow
        Map<String, Object> dsResult = dsService.createOrUpdateWorkflow(payload);

        // If successful, update the local database with the online version (commit
        // hash)
        String workflowUuid = (String) payload.get("uuid");
        if (workflowUuid == null || workflowUuid.isEmpty()) {
            // If no UUID, we can't update the local record. This might happen for DS-native
            // workflows.
            return dsResult;
        }

        DiyWorkflow workflow = diyWorkflowMapper.selectById(workflowUuid);
        if (workflow == null) {
            throw new RuntimeException(
                    "Workflow with UUID " + workflowUuid + " not found in local database after DS update.");
        }


        String filename = workflowUuid + ".yaml";
        String latestCommit = gitService.getLatestCommit(filename);
        Integer version = workflow.getVersion();
        if (version == null) {
            version = 1;
        } else {
            version += 1;
        }
        workflow.setVersion(version);
        workflow.setProcessDefinitionCode((Long) dsResult.get("processDefinitionCode"));
        diyWorkflowMapper.updateById(workflow);

        return dsResult;
    }

    public void deleteWorkflow(String workflowUuid, Long projectCode, Long workflowCode)
            throws Exception {
        boolean deletedSomething = false;
        DiyWorkflow diyWorkflow = this.diyWorkflowMapper.selectById(workflowUuid);
        if (diyWorkflow == null) {
            throw new Exception("workflow not found");
        }
        String workflowName = diyWorkflow.getId();
        String filename = diyWorkflow.getId() + ".yaml";
        Path filePath = Paths.get(workflowRepoDir, filename);

        // 1. Delete from local DB
        this.diyWorkflowMapper.deleteById(diyWorkflow.getId());

        // 2. Delete from git
        if (Files.exists(filePath)) {
            gitService.gitRmAndCommit(filename, "Delete workflow: " + workflowName);
        }

        // 3. Delete from DolphinScheduler if it exists there
        if (diyWorkflow.getProcessDefinitionCode() != null) {
            dsService.getWorkflows().stream()
                    .filter(wf -> wf.get("code").equals(diyWorkflow.getProcessDefinitionCode()))
                    .findFirst()
                    .ifPresent(dsWf -> {
                        try {
                            Long pCode = Long.parseLong(dsWf.get("projectCode").toString());
                            Long wCode = Long.parseLong(dsWf.get("code").toString());
                            dsService.deleteDsWorkflow(pCode, wCode);
                        } catch (Exception e) {
                            // Log and ignore if DS deletion fails, as it might not exist
                        }
                    });
        }


    }

    public String executeWorkflow(String workflowUuid, Map<String, Object> payload) throws Exception {
        DiyWorkflow workflow = this.diyWorkflowMapper.selectById(workflowUuid);
        if (workflow == null) {
            throw new RuntimeException("Workflow not found in database.");
        }
        List<Map<String, Object>> dsWorkflows = dsService.getWorkflows();
        Map<String, Object> dsWorkflow = dsWorkflows.stream()
                .filter(wf -> wf.get("code").equals(workflow.getProcessDefinitionCode()))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Could not find a corresponding online workflow in DolphinScheduler."));

        String projectCode = dsWorkflow.get("projectCode").toString();
        String workflowCode = dsWorkflow.get("code").toString();
        String version = dsWorkflow.get("version").toString();
        String environmentCode = dsService.getEnvCode();

        payload.put("environmentCode", environmentCode);
        payload.put("version", version);
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

    public Map<String, Object> getWorkflowAtCommit(String workflowUuid, String commitHash)
            throws GitAPIException, IOException {
        String filename = workflowUuid + ".yaml";
        return gitService.getCommitDiff(filename, commitHash);
    }

    public Map<String, Object> getFileAtCommit(String filename, String commitHash) throws GitAPIException, IOException {
        return gitService.getFileAtCommit(filename, commitHash);
    }

    public List<Map<String, Object>> getDeletedWorkflows() throws GitAPIException, IOException {
        return gitService.getDeletedFiles();
    }

    public void revertToCommit(String workflowUuid, String commitHash) throws GitAPIException, IOException {
        String filename = workflowUuid + ".yaml";
        gitService.revertFileToCommit(filename, commitHash);
    }
}
