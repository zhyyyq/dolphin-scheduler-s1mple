package com.example.scheduler.service;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpDelete;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.util.EntityUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.yaml.snakeyaml.Yaml;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class DsService {

    @Value("${ds.url}")
    private String dsUrl;

    @Value("${ds.token}")
    private String token;

    private final CloseableHttpClient httpClient = HttpClients.createDefault();
    private final Gson gson = new Gson();
    private static final Logger logger = LoggerFactory.getLogger(DsService.class);

    @Value("${workflow.repo.dir}")
    private String workflowRepoDir;

    public List<Map<String, Object>> getEnvironments() throws Exception {
        HttpGet request = new HttpGet(dsUrl + "/environment/list-paging?pageNo=1&pageSize=1000&searchVal=");
        request.addHeader("token", token);
        CloseableHttpResponse response = httpClient.execute(request);
        String responseString = EntityUtils.toString(response.getEntity());
        JsonObject data = gson.fromJson(responseString, JsonObject.class);

        if (data.get("code").getAsInt() != 0) {
            throw new Exception("DS API error (list-paging): " + data.get("msg").getAsString());
        }
        return gson.fromJson(data.getAsJsonObject("data").getAsJsonArray("totalList"), List.class);
    }

    public List<Map<String, Object>> getWorkflows() throws Exception {
        List<Map<String, Object>> allWorkflows = new ArrayList<>();

        // 1. Get all projects
        HttpGet projectsRequest = new HttpGet(dsUrl + "/projects?pageNo=1&pageSize=100");
        projectsRequest.addHeader("token", token);
        CloseableHttpResponse projectsResponse = httpClient.execute(projectsRequest);
        String projectsResponseString = EntityUtils.toString(projectsResponse.getEntity());
        JsonObject projectsData = gson.fromJson(projectsResponseString, JsonObject.class);

        if (projectsData.get("code").getAsInt() != 0) {
            throw new Exception("DS API error (projects): " + projectsData.get("msg").getAsString());
        }

        JsonArray projectList = projectsData.getAsJsonObject("data").getAsJsonArray("totalList");

        // 2. For each project, get its workflows
        for (int i = 0; i < projectList.size(); i++) {
            JsonObject project = projectList.get(i).getAsJsonObject();
            long projectCode = project.get("code").getAsLong();
            HttpGet workflowsRequest = new HttpGet(dsUrl + "/projects/" + projectCode + "/process-definition?pageNo=1&pageSize=100");
            workflowsRequest.addHeader("token", token);
            CloseableHttpResponse workflowsResponse = httpClient.execute(workflowsRequest);
            String workflowsResponseString = EntityUtils.toString(workflowsResponse.getEntity());
            JsonObject workflowsData = gson.fromJson(workflowsResponseString, JsonObject.class);

            if (workflowsData.get("code").getAsInt() != 0) {
                logger.warn("Failed to get workflows for project {}: {}", projectCode, workflowsData.get("msg").getAsString());
                continue;
            }

            JsonArray projectWorkflows = workflowsData.getAsJsonObject("data").getAsJsonArray("totalList");
            for (int j = 0; j < projectWorkflows.size(); j++) {
                JsonObject wf = projectWorkflows.get(j).getAsJsonObject();
                wf.addProperty("projectName", project.get("name").getAsString());
                long workflowCode = wf.get("code").getAsLong();
                wf.addProperty("uuid", "ds-" + projectCode + "-" + workflowCode);
                
                Map<String, Object> wfMap = gson.fromJson(wf, Map.class);
                wfMap.put("code", String.valueOf(workflowCode));
                wfMap.put("projectCode", String.valueOf(projectCode));
                allWorkflows.add(wfMap);
            }
        }

        return allWorkflows;
    }

    public void deleteDsWorkflow(Long projectCode, Long workflowCode) throws Exception {
        // 1. Get workflow details to check its state
        HttpGet detailsRequest = new HttpGet(dsUrl + "/projects/" + projectCode + "/process-definition/" + workflowCode);
        detailsRequest.addHeader("token", token);
        CloseableHttpResponse detailsResponse = httpClient.execute(detailsRequest);

        if (detailsResponse.getStatusLine().getStatusCode() == 404) {
            logger.warn("Workflow {} not found in DS. Assuming already deleted.", workflowCode);
            return;
        }

        String detailsResponseString = EntityUtils.toString(detailsResponse.getEntity());
        JsonObject workflowData = gson.fromJson(detailsResponseString, JsonObject.class).getAsJsonObject("data");

        if (workflowData == null) {
            throw new Exception("Workflow not found in DolphinScheduler.");
        }

        // 2. If the workflow is online, take it offline first
        if (workflowData.getAsJsonObject("processDefinition").get("releaseState").getAsString().equals("ONLINE")) {
            HttpPost releaseRequest = new HttpPost(dsUrl + "/projects/" + projectCode + "/process-definition/" + workflowCode + "/release?releaseState=OFFLINE");
            releaseRequest.addHeader("token", token);
            CloseableHttpResponse releaseResponse = httpClient.execute(releaseRequest);
            String releaseResponseString = EntityUtils.toString(releaseResponse.getEntity());
            JsonObject releaseData = gson.fromJson(releaseResponseString, JsonObject.class);
            if (releaseData.get("code").getAsInt() != 0) {
                throw new Exception("DS API error (set offline): " + releaseData.get("msg").getAsString());
            }
        }

        // 3. Proceed with deletion
        HttpDelete deleteRequest = new HttpDelete(dsUrl + "/projects/" + projectCode + "/process-definition/" + workflowCode);
        deleteRequest.addHeader("token", token);
        CloseableHttpResponse deleteResponse = httpClient.execute(deleteRequest);
        String deleteResponseString = EntityUtils.toString(deleteResponse.getEntity());
        JsonObject deleteData = gson.fromJson(deleteResponseString, JsonObject.class);
        if (deleteData.get("code").getAsInt() != 0) {
            throw new Exception("DS API error (delete): " + deleteData.get("msg").getAsString());
        }
    }

    public void submitWorkflowToDs(String filename) throws Exception {
        if (filename.contains("..") || filename.contains("/") || filename.contains("\\")) {
            throw new Exception("Invalid workflow filename.");
        }

        Path filePath = Paths.get(workflowRepoDir, filename);
        if (!Files.exists(filePath)) {
            throw new Exception("Workflow file '" + filename + "' not found.");
        }

        Path tmpPath = null;
        try {
            Yaml yaml = new Yaml();
            Map<String, Object> data = yaml.load(new String(Files.readAllBytes(filePath)));

            // In-memory transformation for submission
            // ... (resolve_file_placeholders_recursive and resolve_workflow_placeholders_recursive logic would go here)

            if (data.containsKey("workflow") && !((Map)data.get("workflow")).containsKey("schedule")) {
                ((Map)data.get("workflow")).put("schedule", null);
            }

            tmpPath = Files.createTempFile(null, ".yaml");
            Files.write(tmpPath, yaml.dump(data).getBytes());

            ProcessBuilder processBuilder = new ProcessBuilder("uv", "run", "pydolphinscheduler", "yaml", "-f", tmpPath.toString());
            processBuilder.directory(new File(workflowRepoDir));
            Process process = processBuilder.start();
            int exitCode = process.waitFor();

            if (exitCode != 0) {
                throw new Exception("pydolphinscheduler CLI failed.");
            }

        } finally {
            if (tmpPath != null) {
                Files.deleteIfExists(tmpPath);
            }
        }
    }

    public Map<String, Object> executeDsWorkflow(Long projectCode, Long processDefinitionCode, Map<String, Object> payload) throws Exception {
        HttpPost executeRequest = new HttpPost(dsUrl + "/projects/" + projectCode + "/executors/start-process-instance");
        executeRequest.addHeader("token", token);

        Map<String, Object> apiPayload = new HashMap<>();
        apiPayload.put("processDefinitionCode", processDefinitionCode);
        apiPayload.put("failureStrategy", "CONTINUE");
        apiPayload.put("warningType", "NONE");
        apiPayload.put("warningGroupId", null);
        apiPayload.put("execType", null);
        apiPayload.put("startNodeList", "");
        apiPayload.put("taskDependType", "TASK_POST");
        apiPayload.put("runMode", "RUN_MODE_SERIAL");
        apiPayload.put("processInstancePriority", "MEDIUM");
        apiPayload.put("workerGroup", "default");
        apiPayload.put("environmentCode", payload.getOrDefault("environmentCode", -1));
        apiPayload.put("timeout", null);
        apiPayload.put("scheduleTime", "");
        apiPayload.put("expectedParallelismNumber", null);
        apiPayload.put("dryRun", 0);
        apiPayload.put("testFlag", 0);

        if ((boolean) payload.getOrDefault("isBackfill", false)) {
            apiPayload.put("execType", "COMPLEMENT_DATA");
            if ("parallel".equals(payload.get("runMode"))) {
                apiPayload.put("runMode", "RUN_MODE_PARALLEL");
            }
            apiPayload.put("complementDependentMode", "OFF_MODE");
            if ("ASC".equalsIgnoreCase((String) payload.getOrDefault("runOrder", "desc"))) {
                apiPayload.put("executionOrder", "ASC_ORDER");
            } else {
                apiPayload.put("executionOrder", "DESC_ORDER");
            }
        } else {
            apiPayload.put("execType", "START_PROCESS");
        }

        Map<String, String> scheduleTimeObj = new HashMap<>();
        scheduleTimeObj.put("complementStartDate", (String) payload.get("startDate"));
        scheduleTimeObj.put("complementEndDate", (String) payload.get("endDate"));
        apiPayload.put("scheduleTime", gson.toJson(scheduleTimeObj));

        executeRequest.setEntity(new StringEntity(gson.toJson(apiPayload)));
        CloseableHttpResponse executeResponse = httpClient.execute(executeRequest);
        String executeResponseString = EntityUtils.toString(executeResponse.getEntity());
        JsonObject executeData = gson.fromJson(executeResponseString, JsonObject.class);
        if (executeData.get("code").getAsInt() != 0) {
            throw new Exception("DS API error (execute): " + executeData.get("msg").getAsString());
        }
        return gson.fromJson(executeData.getAsJsonObject("data"), Map.class);
    }

    public Map<String, Object> getWorkflowInstanceStats() throws Exception {
        Map<String, Object> stats = new HashMap<>();
        stats.put("success", 0);
        stats.put("failure", 0);
        stats.put("running", 0);
        stats.put("other", 0);
        stats.put("total", 0);
        stats.put("recent_instances", new ArrayList<>());

        // 1. Get the first project
        HttpGet projectsRequest = new HttpGet(dsUrl + "/projects?pageNo=1&pageSize=1");
        projectsRequest.addHeader("token", token);
        CloseableHttpResponse projectsResponse = httpClient.execute(projectsRequest);
        String projectsResponseString = EntityUtils.toString(projectsResponse.getEntity());
        JsonObject projectsData = gson.fromJson(projectsResponseString, JsonObject.class);

        if (projectsData.get("code").getAsInt() != 0 || projectsData.getAsJsonObject("data").getAsJsonArray("totalList").size() == 0) {
            throw new Exception("Could not find any projects in DolphinScheduler.");
        }
        long projectCode = projectsData.getAsJsonObject("data").getAsJsonArray("totalList").get(0).getAsJsonObject().get("code").getAsLong();

        // 2. Get process instances for the project
        HttpGet instancesRequest = new HttpGet(dsUrl + "/projects/" + projectCode + "/process-instances?pageNo=1&pageSize=100");
        instancesRequest.addHeader("token", token);
        CloseableHttpResponse instancesResponse = httpClient.execute(instancesRequest);
        String instancesResponseString = EntityUtils.toString(instancesResponse.getEntity());
        JsonObject instancesData = gson.fromJson(instancesResponseString, JsonObject.class);

        if (instancesData.get("code").getAsInt() != 0) {
            throw new Exception("DS API error (process-instances): " + instancesData.get("msg").getAsString());
        }

        JsonArray instanceList = instancesData.getAsJsonObject("data").getAsJsonArray("totalList");
        stats.put("total", instancesData.getAsJsonObject("data").get("total").getAsInt());
        stats.put("recent_instances", gson.fromJson(instanceList, List.class));

        for (int i = 0; i < instanceList.size(); i++) {
            JsonObject instance = instanceList.get(i).getAsJsonObject();
            String state = instance.get("state").getAsString();
            switch (state) {
                case "SUCCESS":
                    stats.put("success", (int) stats.get("success") + 1);
                    break;
                case "FAILURE":
                case "STOP":
                case "KILL":
                    stats.put("failure", (int) stats.get("failure") + 1);
                    break;
                case "RUNNING_EXECUTION":
                    stats.put("running", (int) stats.get("running") + 1);
                    break;
                default:
                    stats.put("other", (int) stats.get("other") + 1);
                    break;
            }
        }

        return stats;
    }
}
