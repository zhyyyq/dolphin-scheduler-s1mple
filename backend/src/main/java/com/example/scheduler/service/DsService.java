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
                wf.addProperty("uuid", "ds-" + projectCode + "-" + wf.get("code").getAsLong());
                allWorkflows.add(gson.fromJson(wf, Map.class));
            }
        }

        return allWorkflows;
    }

    public void deleteDsWorkflow(Long projectCode, Long workflowCode) throws Exception {
        // 1. Get workflow details to check its state
        HttpGet detailsRequest = new HttpGet(dsUrl + "/projects/" + projectCode + "/process-definition/" + workflowCode);
        detailsRequest.addHeader("token", token);
        CloseableHttpResponse detailsResponse = httpClient.execute(detailsRequest);
        String detailsResponseString = EntityUtils.toString(detailsResponse.getEntity());
        JsonObject workflowData = gson.fromJson(detailsResponseString, JsonObject.class).getAsJsonObject("data");

        // 2. If the workflow is online, take it offline first
        if (workflowData.getAsJsonObject("processDefinition").get("releaseState").getAsString().equals("ONLINE")) {
            HttpPost releaseRequest = new HttpPost(dsUrl + "/projects/" + projectCode + "/process-definition/" + workflowCode + "/release");
            releaseRequest.addHeader("token", token);
            releaseRequest.setEntity(new StringEntity("{\"releaseState\":\"OFFLINE\"}"));
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
        // This is a placeholder. The actual implementation will depend on the DS API.
        // You might need to read the file content and send it in the request body.
        System.out.println("Submitting workflow " + filename + " to DolphinScheduler...");
    }

    public Map<String, Object> executeDsWorkflow(Long projectCode, Long processDefinitionCode, Map<String, Object> payload) throws Exception {
        HttpPost executeRequest = new HttpPost(dsUrl + "/projects/" + projectCode + "/executors/start-process-instance");
        executeRequest.addHeader("token", token);
        payload.put("processDefinitionCode", processDefinitionCode);
        executeRequest.setEntity(new StringEntity(gson.toJson(payload)));
        CloseableHttpResponse executeResponse = httpClient.execute(executeRequest);
        String executeResponseString = EntityUtils.toString(executeResponse.getEntity());
        JsonObject executeData = gson.fromJson(executeResponseString, JsonObject.class);
        if (executeData.get("code").getAsInt() != 0) {
            throw new Exception("DS API error (execute): " + executeData.get("msg").getAsString());
        }
        return gson.fromJson(executeData.getAsJsonObject("data"), Map.class);
    }

    public Map<String, Integer> getWorkflowInstanceStats() throws Exception {
        Map<String, Integer> stats = new HashMap<>();
        stats.put("RUNNING_EXECUTION", 0);
        stats.put("SUCCESS", 0);
        stats.put("FAILURE", 0);
        stats.put("STOP", 0);
        stats.put("KILL", 0);

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

        // 2. For each project, get its process instances
        for (int i = 0; i < projectList.size(); i++) {
            JsonObject project = projectList.get(i).getAsJsonObject();
            long projectCode = project.get("code").getAsLong();
            HttpGet instancesRequest = new HttpGet(dsUrl + "/projects/" + projectCode + "/process-instances?pageNo=1&pageSize=100");
            instancesRequest.addHeader("token", token);
            CloseableHttpResponse instancesResponse = httpClient.execute(instancesRequest);
            String instancesResponseString = EntityUtils.toString(instancesResponse.getEntity());
            JsonObject instancesData = gson.fromJson(instancesResponseString, JsonObject.class);

            if (instancesData.get("code").getAsInt() != 0) {
                logger.warn("Failed to get instances for project {}: {}", projectCode, instancesData.get("msg").getAsString());
                continue;
            }

            JsonArray instanceList = instancesData.getAsJsonObject("data").getAsJsonArray("totalList");
            for (int j = 0; j < instanceList.size(); j++) {
                JsonObject instance = instanceList.get(j).getAsJsonObject();
                String state = instance.get("state").getAsString();
                if (stats.containsKey(state)) {
                    stats.put(state, stats.get(state) + 1);
                }
            }
        }
        return stats;
    }
}
