package com.example.scheduler.service;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpDelete;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.NameValuePair;
import org.apache.http.client.entity.UrlEncodedFormEntity;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.client.utils.URIBuilder;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.message.BasicNameValuePair;
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
    private static final Logger logger = LoggerFactory.getLogger(DsService.class);

    @Value("${workflow.repo.dir}")
    private String workflowRepoDir;

    public String getEnvCode() throws Exception {
        HttpGet request = new HttpGet(dsUrl + "/environment/list-paging?pageNo=1&pageSize=1000&searchVal=");
        request.addHeader("token", token);
        CloseableHttpResponse response = httpClient.execute(request);
        String responseString = EntityUtils.toString(response.getEntity(), "UTF-8");
        JSONObject data = JSON.parseObject(responseString);

        if (data.getIntValue("code") != 0) {
            throw new Exception("DS API error (list-paging): " + data.getString("msg"));
        }
        return data.getJSONObject("data").getJSONArray("totalList").getJSONObject(0).getString("code");
    }

    public List<Map<String, Object>> getProjects() throws Exception {
        HttpGet request = new HttpGet(dsUrl + "/projects?pageNo=1&pageSize=1000");
        request.addHeader("token", token);
        CloseableHttpResponse response = httpClient.execute(request);
        String responseString = EntityUtils.toString(response.getEntity());
        JSONObject data = JSON.parseObject(responseString);

        if (data.getIntValue("code") != 0) {
            throw new Exception("DS API error (getProjects): " + data.getString("msg"));
        }

        JSONArray projectList = data.getJSONObject("data").getJSONArray("totalList");
        List<Map<String, Object>> result = new ArrayList<>();
        for (int i = 0; i < projectList.size(); i++) {
            result.add(projectList.getJSONObject(i).getInnerMap());
        }
        return result;
    }

    public List<Map<String, Object>> getWorkflowsByProject(Long projectCode) throws Exception {
        HttpGet request = new HttpGet(dsUrl + "/projects/" + projectCode + "/process-definition?pageNo=1&pageSize=1000");
        request.addHeader("token", token);
        CloseableHttpResponse response = httpClient.execute(request);
        String responseString = EntityUtils.toString(response.getEntity());
        JSONObject data = JSON.parseObject(responseString);

        if (data.getIntValue("code") != 0) {
            throw new Exception("DS API error (getWorkflowsByProject): " + data.getString("msg"));
        }

        JSONArray workflowList = data.getJSONObject("data").getJSONArray("totalList");
        List<Map<String, Object>> result = new ArrayList<>();
        for (int i = 0; i < workflowList.size(); i++) {
            result.add(workflowList.getJSONObject(i).getInnerMap());
        }
        return result;
    }

    public List<Map<String, Object>> getWorkflows() throws Exception {
        List<Map<String, Object>> allWorkflows = new ArrayList<>();

        // 1. Get all projects
        List<Map<String, Object>> projectList = getProjects();

        // 2. For each project, get its workflows
        for (Map<String, Object> project : projectList) {
            long projectCode = ((Number) project.get("code")).longValue();
            try {
                List<Map<String, Object>> projectWorkflows = getWorkflowsByProject(projectCode);
                for (Map<String, Object> wf : projectWorkflows) {
                    wf.put("projectName", project.get("name"));
                    long workflowCode = ((Number) wf.get("code")).longValue();
                    wf.put("uuid", "ds-" + projectCode + "-" + workflowCode);
                    wf.put("code", String.valueOf(workflowCode));
                    wf.put("projectCode", String.valueOf(projectCode));
                    allWorkflows.add(wf);
                }
            } catch (Exception e) {
                logger.warn("Failed to get workflows for project {}: {}", projectCode, e.getMessage());
            }
        }

        return allWorkflows;
    }

    public JSONArray getUsers() throws Exception {
        HttpGet request = new HttpGet(dsUrl + "/users/list-all?pageNo=1&pageSize=1000");
        request.addHeader("token", token);
        CloseableHttpResponse response = httpClient.execute(request);
        String responseString = EntityUtils.toString(response.getEntity());
        JSONObject data = JSON.parseObject(responseString);
        logger.info("DS API response for getUsers: {}", data.toJSONString());
        if (data.getIntValue("code") != 0) {
            throw new Exception("DS API error (getUsers): " + data.getString("msg"));
        }
        return data.getJSONArray("data");
    }

    public List<Map<String, Object>> getDatasources() throws Exception {
        HttpGet request = new HttpGet(dsUrl + "/datasources?pageNo=1&pageSize=1000");
        request.addHeader("token", token);
        CloseableHttpResponse response = httpClient.execute(request);
        String responseString = EntityUtils.toString(response.getEntity());
        JSONObject data = JSON.parseObject(responseString);

        if (data.getIntValue("code") != 0) {
            throw new Exception("DS API error (datasources): " + data.getString("msg"));
        }

        JSONArray datasourceList = data.getJSONObject("data").getJSONArray("totalList");
        List<Map<String, Object>> result = new ArrayList<>();
        for (int i = 0; i < datasourceList.size(); i++) {
            JSONObject ds = datasourceList.getJSONObject(i);
            Map<String, Object> dsMap = new HashMap<>();
            dsMap.put("label", ds.getString("name"));
            dsMap.put("value", ds.getString("name"));
            dsMap.put("id", ds.getIntValue("id"));
            dsMap.put("type", ds.getString("type"));
            result.add(dsMap);
        }
        return result;
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
        JSONObject workflowData = JSON.parseObject(detailsResponseString).getJSONObject("data");

        if (workflowData == null) {
            throw new Exception("Workflow not found in DolphinScheduler.");
        }

        // 2. If the workflow is online, take it offline first
        if (workflowData.getJSONObject("processDefinition").getString("releaseState").equals("ONLINE")) {
            HttpPost releaseRequest = new HttpPost(dsUrl + "/projects/" + projectCode + "/process-definition/" + workflowCode + "/release?releaseState=OFFLINE");
            releaseRequest.addHeader("token", token);
            CloseableHttpResponse releaseResponse = httpClient.execute(releaseRequest);
            String releaseResponseString = EntityUtils.toString(releaseResponse.getEntity());
            JSONObject releaseData = JSON.parseObject(releaseResponseString);
            if (releaseData.getIntValue("code") != 0) {
                throw new Exception("DS API error (set offline): " + releaseData.getString("msg"));
            }
        }

        // 3. Proceed with deletion
        HttpDelete deleteRequest = new HttpDelete(dsUrl + "/projects/" + projectCode + "/process-definition/" + workflowCode);
        deleteRequest.addHeader("token", token);
        CloseableHttpResponse deleteResponse = httpClient.execute(deleteRequest);
        String deleteResponseString = EntityUtils.toString(deleteResponse.getEntity());
        JSONObject deleteData = JSON.parseObject(deleteResponseString);
        if (deleteData.getIntValue("code") != 0) {
            throw new Exception("DS API error (delete): " + deleteData.getString("msg"));
        }
    }

    public long findOrCreateProject(String projectName) throws Exception {
        // List all projects and find by name, as search API can be unreliable
        HttpGet projectsRequest = new HttpGet(dsUrl + "/projects?pageNo=1&pageSize=1000");
        projectsRequest.addHeader("token", token);
        CloseableHttpResponse projectsResponse = httpClient.execute(projectsRequest);
        String projectsResponseString = EntityUtils.toString(projectsResponse.getEntity());
        JSONObject projectsData = JSON.parseObject(projectsResponseString);

        if (projectsData.getIntValue("code") != 0) {
            throw new Exception("DS API error (listing projects): " + projectsData.getString("msg"));
        }

        JSONArray projectList = projectsData.getJSONObject("data").getJSONArray("totalList");
        for (int i = 0; i < projectList.size(); i++) {
            JSONObject project = projectList.getJSONObject(i);
            if (projectName.equals(project.getString("name"))) {
                return project.getLongValue("code");
            }
        }

        // If not found, create it with default values
        return createProject(projectName, "Default description", "admin");
    }

    public Map<String, Object> createOrUpdateWorkflow(Map<String, Object> payload) throws Exception {
        String workflowName = (String) payload.get("name");
        String projectName = (String) payload.getOrDefault("project", "default");

        if (workflowName == null || workflowName.trim().isEmpty()) {
            throw new Exception("Workflow name cannot be empty.");
        }

        // 1. Find or create project
        long projectCode = findOrCreateProject(projectName);

        // 2. Check if workflow exists to decide between create and update
        Map<String, Object> existingDsWorkflow = getWorkflows().stream()
            .filter(wf -> wf.get("name").equals(workflowName) && Long.parseLong(wf.get("projectCode").toString()) == projectCode)
            .findFirst()
            .orElse(null);

        boolean isNew = (boolean) payload.getOrDefault("isNew", false);
        if (isNew && existingDsWorkflow != null) {
            throw new Exception("不允许提交重名工作流。项目 '" + projectName + "' 中已存在名为 '" + workflowName + "' 的工作流。");
        }

        // 3. Prepare parameters from payload
        List<NameValuePair> params = new ArrayList<>();
        for (Map.Entry<String, Object> entry : payload.entrySet()) {
            if (entry.getValue() != null && !entry.getKey().equals("project") && !entry.getKey().equals("isNew")) { // Don't send project or isNew as a param
                params.add(new BasicNameValuePair(entry.getKey(), entry.getValue().toString()));
            }
        }

        logger.info("Sending create/update request for workflow '{}' with params:", workflowName);
        for(NameValuePair nvp : params) {
            logger.info("  - {}: {}", nvp.getName(), nvp.getValue());
        }

        // 4. Execute Create or Update
        String url;
        HttpPost postRequest = null;
        org.apache.http.client.methods.HttpPut putRequest = null;

        if (existingDsWorkflow != null) {
            // UPDATE
            long workflowCode = Long.parseLong(existingDsWorkflow.get("code").toString());

            // Step 1: Take the workflow offline before updating
            HttpPost releaseRequestOffline = new HttpPost(dsUrl + "/projects/" + projectCode + "/process-definition/" + workflowCode + "/release");
            releaseRequestOffline.addHeader("token", token);
            List<NameValuePair> releaseParamsOffline = new ArrayList<>();
            releaseParamsOffline.add(new BasicNameValuePair("releaseState", "OFFLINE"));
            releaseRequestOffline.setEntity(new UrlEncodedFormEntity(releaseParamsOffline));
            CloseableHttpResponse releaseResponseOffline = httpClient.execute(releaseRequestOffline);
            String releaseResponseStringOffline = EntityUtils.toString(releaseResponseOffline.getEntity());
            JSONObject releaseDataOffline = JSON.parseObject(releaseResponseStringOffline);
            // We can ignore the error if it's already offline, but log a warning.
            if (releaseDataOffline.getIntValue("code") != 0) {
                 logger.warn("Could not set workflow to OFFLINE before update (it might be already offline): " + releaseDataOffline.getString("msg"));
            }

            // Step 2: Perform the update
            url = dsUrl + "/projects/" + projectCode + "/process-definition/" + workflowCode;
            putRequest = new org.apache.http.client.methods.HttpPut(url);
            putRequest.addHeader("token", token);
            putRequest.addHeader("Content-Type", "application/x-www-form-urlencoded");
            putRequest.setEntity(new UrlEncodedFormEntity(params, "UTF-8"));
        } else {
            // CREATE
            url = dsUrl + "/projects/" + projectCode + "/process-definition";
            postRequest = new HttpPost(url);
            postRequest.addHeader("token", token);
            postRequest.addHeader("Content-Type", "application/x-www-form-urlencoded");
            postRequest.setEntity(new UrlEncodedFormEntity(params, "UTF-8"));
        }

        CloseableHttpResponse response = (putRequest != null) ? httpClient.execute(putRequest) : httpClient.execute(postRequest);
        String responseString = EntityUtils.toString(response.getEntity());
        JSONObject responseData = JSON.parseObject(responseString);

        if (responseData.getIntValue("code") != 0) {
            throw new Exception("DS API error (create/update workflow): " + responseData.getString("msg"));
        }
        
        JSONObject processDefinition = responseData.getJSONObject("data");
        long processCode = processDefinition.getLongValue("code");

        // 5. Release the workflow to make it online
        String taskDefinitionJson = (String) payload.get("taskDefinitionJson");
        if (taskDefinitionJson != null && !taskDefinitionJson.equals("[]")) {
            HttpPost releaseRequest = new HttpPost(dsUrl + "/projects/" + projectCode + "/process-definition/" + processCode + "/release");
            releaseRequest.addHeader("token", token);
            List<NameValuePair> releaseParams = new ArrayList<>();
            releaseParams.add(new BasicNameValuePair("releaseState", "ONLINE"));
            releaseRequest.setEntity(new UrlEncodedFormEntity(releaseParams));
            CloseableHttpResponse releaseResponse = httpClient.execute(releaseRequest);
            String releaseResponseString = EntityUtils.toString(releaseResponse.getEntity());
            JSONObject releaseData = JSON.parseObject(releaseResponseString);
            if (releaseData.getIntValue("code") != 0) {
                throw new Exception("DS API error (release workflow): " + releaseData.getString("msg"));
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("projectCode", projectCode);
        result.put("processDefinitionCode", processCode);

        // 6. Handle schedule if present
        if (payload.containsKey("schedule")) {
            // First, delete any existing schedule for this workflow
            deleteScheduleByProcessCode(projectCode, processCode);

            Object scheduleObj = payload.get("schedule");
            if (scheduleObj != null) {
                Map<String, Object> schedulePayload = new HashMap<>();
                if (scheduleObj instanceof Map) {
                    schedulePayload.put("schedule", JSON.toJSONString(scheduleObj));
                } else {
                    schedulePayload.put("schedule", scheduleObj.toString());
                }
                schedulePayload.put("processDefinitionCode", processCode);
                // Add other necessary schedule parameters from payload or defaults
                schedulePayload.put("failureStrategy", payload.getOrDefault("failureStrategy", "CONTINUE"));
                schedulePayload.put("warningType", payload.getOrDefault("warningType", "NONE"));
                schedulePayload.put("processInstancePriority", payload.getOrDefault("processInstancePriority", "MEDIUM"));
                schedulePayload.put("warningGroupId", payload.getOrDefault("warningGroupId", 0));
                schedulePayload.put("workerGroup", payload.getOrDefault("workerGroup", "default"));
                schedulePayload.put("tenantCode", payload.getOrDefault("tenantCode", "default"));
                schedulePayload.put("environmentCode", payload.getOrDefault("environmentCode", -1));

                Map<String, Object> createdSchedule = createSchedule(projectCode, schedulePayload);
                if (createdSchedule != null && createdSchedule.containsKey("id")) {
                    int scheduleId = ((Number) createdSchedule.get("id")).intValue();
                    onlineSchedule(projectCode, scheduleId);
                }
            }
        }

        return result;
    }

    public Map<String, Object> createSchedule(long projectCode, Map<String, Object> payload) throws Exception {
        String url = dsUrl + "/projects/" + projectCode + "/schedules";
        HttpPost postRequest = new HttpPost(url);
        postRequest.addHeader("token", token);
        postRequest.addHeader("Content-Type", "application/x-www-form-urlencoded");

        List<NameValuePair> params = new ArrayList<>();
        for (Map.Entry<String, Object> entry : payload.entrySet()) {
            if (entry.getValue() != null) {
                params.add(new BasicNameValuePair(entry.getKey(), entry.getValue().toString()));
            }
        }

        postRequest.setEntity(new UrlEncodedFormEntity(params, "UTF-8"));
        CloseableHttpResponse response = httpClient.execute(postRequest);
        String responseString = EntityUtils.toString(response.getEntity());
        JSONObject responseData = JSON.parseObject(responseString);

        if (responseData.getIntValue("code") != 0) {
            throw new Exception("DS API error (create schedule): " + responseData.getString("msg"));
        }
        
        // Return the created schedule object
        return responseData.getJSONObject("data").getInnerMap();
    }

    public void onlineSchedule(long projectCode, int scheduleId) throws Exception {
        String url = dsUrl + "/projects/" + projectCode + "/schedules/" + scheduleId + "/online";
        HttpPost postRequest = new HttpPost(url);
        postRequest.addHeader("token", token);
        postRequest.addHeader("Content-Type", "application/x-www-form-urlencoded"); // DS API requires this header even for empty body

        CloseableHttpResponse response = httpClient.execute(postRequest);
        String responseString = EntityUtils.toString(response.getEntity());
        JSONObject responseData = JSON.parseObject(responseString);

        if (responseData.getIntValue("code") != 0) {
            throw new Exception("DS API error (online schedule): " + responseData.getString("msg"));
        }
    }

    public void offlineSchedule(long projectCode, int scheduleId) throws Exception {
        String url = dsUrl + "/projects/" + projectCode + "/schedules/" + scheduleId + "/offline";
        HttpPost postRequest = new HttpPost(url);
        postRequest.addHeader("token", token);
        postRequest.addHeader("Content-Type", "application/x-www-form-urlencoded");
        CloseableHttpResponse response = httpClient.execute(postRequest);
        String responseString = EntityUtils.toString(response.getEntity());
        JSONObject responseData = JSON.parseObject(responseString);
        if (responseData.getIntValue("code") != 0) {
            // It might already be offline, so just log a warning
            logger.warn("DS API error (offline schedule): " + responseData.getString("msg"));
        }
    }

    public void deleteSchedule(long projectCode, int scheduleId) throws Exception {
        String url = dsUrl + "/projects/" + projectCode + "/schedules/" + scheduleId;
        HttpDelete deleteRequest = new HttpDelete(url);
        deleteRequest.addHeader("token", token);
        CloseableHttpResponse response = httpClient.execute(deleteRequest);
        String responseString = EntityUtils.toString(response.getEntity());
        JSONObject responseData = JSON.parseObject(responseString);
        if (responseData.getIntValue("code") != 0) {
            logger.warn("DS API error (delete schedule): " + responseData.getString("msg"));
        }
    }

    private void deleteScheduleByProcessCode(long projectCode, long processCode) throws Exception {
        // 1. Find the schedule by processDefinitionCode
        String url = dsUrl + "/projects/" + projectCode + "/schedules?processDefinitionCode=" + processCode + "&pageNo=1&pageSize=10";
        HttpGet getRequest = new HttpGet(url);
        getRequest.addHeader("token", token);
        CloseableHttpResponse response = httpClient.execute(getRequest);
        String responseString = EntityUtils.toString(response.getEntity());
        JSONObject responseData = JSON.parseObject(responseString);

        if (responseData.getIntValue("code") != 0) {
            logger.warn("Could not list schedules for process code {}: {}", processCode, responseData.getString("msg"));
            return;
        }

        JSONArray schedules = responseData.getJSONObject("data").getJSONArray("totalList");
        if (schedules.size() > 0) {
            // Assuming one process has only one schedule
            JSONObject schedule = schedules.getJSONObject(0);
            int scheduleId = schedule.getIntValue("id");
            String releaseState = schedule.getString("releaseState");

            // 2. Offline the schedule if it's online
            if ("ONLINE".equals(releaseState)) {
                offlineSchedule(projectCode, scheduleId);
            }

            // 3. Delete the schedule
            deleteSchedule(projectCode, scheduleId);
        }
    }

    public long createProject(String projectName, String description, String userName) throws Exception {
        HttpPost createRequest = new HttpPost(dsUrl + "/projects");
        createRequest.addHeader("token", token);
        createRequest.addHeader("Content-Type", "application/x-www-form-urlencoded");
        List<NameValuePair> params = new ArrayList<>();
        params.add(new BasicNameValuePair("projectName", projectName));
        params.add(new BasicNameValuePair("description", description));
        params.add(new BasicNameValuePair("userName", userName));
        createRequest.setEntity(new UrlEncodedFormEntity(params, "UTF-8"));
        
        CloseableHttpResponse createResponse = httpClient.execute(createRequest);
        String createResponseString = EntityUtils.toString(createResponse.getEntity());
        JSONObject createData = JSON.parseObject(createResponseString);
        
        if (createData.getIntValue("code") != 0) {
            throw new Exception("DS API error (create project): " + createData.getString("msg"));
        }
        
        JSONObject createDataElement = createData.getJSONObject("data");
        if (createDataElement == null) {
            throw new Exception("DS API error (create project): response did not contain project data.");
        }
        return createDataElement.getLongValue("code");
    }

    public void deleteProject(Long projectCode) throws Exception {
        HttpDelete deleteRequest = new HttpDelete(dsUrl + "/projects/" + projectCode);
        deleteRequest.addHeader("token", token);
        CloseableHttpResponse deleteResponse = httpClient.execute(deleteRequest);
        String deleteResponseString = EntityUtils.toString(deleteResponse.getEntity(), "UTF-8");
        JSONObject deleteData = JSON.parseObject(deleteResponseString);

        if (deleteData.getIntValue("code") != 0) {
            throw new Exception("DS API error (delete project): " + deleteData.getString("msg"));
        }
    }

    public String executeDsWorkflow(String projectCode, String processDefinitionCode, Map<String, Object> payload) throws Exception {
        HttpPost executeRequest = new HttpPost(dsUrl + "/projects/" + projectCode + "/executors/start-process-instance");
        executeRequest.addHeader("token", token);
        executeRequest.addHeader("Content-Type", "application/x-www-form-urlencoded");

        List<NameValuePair> params = new ArrayList<>();
        params.add(new BasicNameValuePair("processDefinitionCode", processDefinitionCode));
        params.add(new BasicNameValuePair("failureStrategy", "CONTINUE"));
        params.add(new BasicNameValuePair("warningType", "NONE"));
        params.add(new BasicNameValuePair("warningGroupId", ""));
        params.add(new BasicNameValuePair("startNodeList", ""));
        params.add(new BasicNameValuePair("taskDependType", "TASK_POST"));
        params.add(new BasicNameValuePair("complementDependentMode", "OFF_MODE"));
        params.add(new BasicNameValuePair("runMode", "RUN_MODE_SERIAL"));
        params.add(new BasicNameValuePair("processInstancePriority", "MEDIUM"));
        params.add(new BasicNameValuePair("workerGroup", "default"));
        params.add(new BasicNameValuePair("tenantCode", "default"));
        params.add(new BasicNameValuePair("environmentCode", payload.get("environmentCode").toString()));
        params.add(new BasicNameValuePair("startParams", "[]"));
        params.add(new BasicNameValuePair("expectedParallelismNumber", "2"));
        params.add(new BasicNameValuePair("dryRun", "0"));
        params.add(new BasicNameValuePair("testFlag", "0"));
        params.add(new BasicNameValuePair("version", payload.get("version").toString()));
        params.add(new BasicNameValuePair("allLevelDependent", "false"));


        if ((boolean) payload.getOrDefault("isBackfill", false)) {
            params.add(new BasicNameValuePair("execType", "COMPLEMENT_DATA"));
            if ("parallel".equals(payload.get("runMode"))) {
                params.add(new BasicNameValuePair("runMode", "RUN_MODE_PARALLEL"));
            }
            if ("ASC".equalsIgnoreCase((String) payload.getOrDefault("runOrder", "desc"))) {
                params.add(new BasicNameValuePair("executionOrder", "ASC_ORDER"));
            } else {
                params.add(new BasicNameValuePair("executionOrder", "DESC_ORDER"));
            }
            Map<String, String> scheduleTimeObj = new HashMap<>();
            scheduleTimeObj.put("complementStartDate", (String) payload.get("startDate"));
            scheduleTimeObj.put("complementEndDate", (String) payload.get("endDate"));
            params.add(new BasicNameValuePair("scheduleTime", JSON.toJSONString(scheduleTimeObj)));
        } else {
            params.add(new BasicNameValuePair("execType", "START_PROCESS"));
            params.add(new BasicNameValuePair("executionOrder", "DESC_ORDER"));
            params.add(new BasicNameValuePair("scheduleTime", ""));
        }


        executeRequest.setEntity(new UrlEncodedFormEntity(params));
        CloseableHttpResponse executeResponse = httpClient.execute(executeRequest);
        String executeResponseString = EntityUtils.toString(executeResponse.getEntity());
        JSONObject executeData = JSON.parseObject(executeResponseString);
        if (executeData.getIntValue("code") != 0) {
            throw new Exception("DS API error (execute): " + executeData.getString("msg"));
        }
        return executeData.getString("data");
    }

    public Map<String, Object> getWorkflowInstanceStateCount(Long projectCode) throws Exception {
        return getWorkflowInstanceStateCount(projectCode, null, null);
    }

    public Map<String, Object> getWorkflowInstanceStateCount(Long projectCode, String startDate, String endDate) throws Exception {
        URIBuilder builder = new URIBuilder(dsUrl + "/projects/analysis/process-state-count");
        if (projectCode != null) {
            builder.setParameter("projectCode", String.valueOf(projectCode));
        }
        if (startDate != null) {
            builder.setParameter("startDate", startDate);
        }
        if (endDate != null) {
            builder.setParameter("endDate", endDate);
        }
        HttpGet request = new HttpGet(builder.build());
        request.addHeader("token", token);
        CloseableHttpResponse response = httpClient.execute(request);
        String responseString = EntityUtils.toString(response.getEntity());
        JSONObject data = JSON.parseObject(responseString);
        if (data.getIntValue("code") != 0) {
            throw new Exception("DS API error (process-state-count): " + data.getString("msg"));
        }
        return data.getJSONObject("data").getInnerMap();
    }

    public Map<String, Object> getTaskInstanceStateCount(Long projectCode) throws Exception {
        return getTaskInstanceStateCount(projectCode, null, null);
    }

    public Map<String, Object> getTaskInstanceStateCount(Long projectCode, String startDate, String endDate) throws Exception {
        URIBuilder builder = new URIBuilder(dsUrl + "/projects/analysis/task-state-count");
        if (projectCode != null) {
            builder.setParameter("projectCode", String.valueOf(projectCode));
        }
        if (startDate != null) {
            builder.setParameter("startDate", startDate);
        }
        if (endDate != null) {
            builder.setParameter("endDate", endDate);
        }
        HttpGet request = new HttpGet(builder.build());
        request.addHeader("token", token);
        CloseableHttpResponse response = httpClient.execute(request);
        String responseString = EntityUtils.toString(response.getEntity());
        JSONObject data = JSON.parseObject(responseString);
        if (data.getIntValue("code") != 0) {
            throw new Exception("DS API error (task-state-count): " + data.getString("msg"));
        }
        return data.getJSONObject("data").getInnerMap();
    }

    public List<Map<String, Object>> getTopNLongestRunningProcessInstance(Long projectCode, int topN, String startDate, String endDate) throws Exception {
        URIBuilder builder = new URIBuilder(dsUrl + "/projects/" + projectCode + "/process-instances/top-n");
        builder.setParameter("size", String.valueOf(topN));
        if (startDate != null) {
            builder.setParameter("startDate", startDate);
        }
        if (endDate != null) {
            builder.setParameter("endDate", endDate);
        }
        HttpGet request = new HttpGet(builder.build());
        request.addHeader("token", token);
        CloseableHttpResponse response = httpClient.execute(request);
        String responseString = EntityUtils.toString(response.getEntity());
        JSONObject data = JSON.parseObject(responseString);
        if (data.getIntValue("code") != 0) {
            throw new Exception("DS API error (top-n): " + data.getString("msg"));
        }
        return (List<Map<String, Object>>) data.getJSONObject("data").get("longestRunningProcess");
    }

    public Map<String, Object> getQueueCount() throws Exception {
        HttpGet request = new HttpGet(dsUrl + "/projects/analysis/queue-count");
        request.addHeader("token", token);
        CloseableHttpResponse response = httpClient.execute(request);
        String responseString = EntityUtils.toString(response.getEntity());
        JSONObject data = JSON.parseObject(responseString);
        if (data.getIntValue("code") != 0) {
            throw new Exception("DS API error (queue-count): " + data.getString("msg"));
        }
        return data.getJSONObject("data").getInnerMap();
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
        JSONObject projectsData = JSON.parseObject(projectsResponseString);

        if (projectsData.getIntValue("code") != 0 || projectsData.getJSONObject("data").getJSONArray("totalList").size() == 0) {
            throw new Exception("Could not find any projects in DolphinScheduler.");
        }
        long projectCode = projectsData.getJSONObject("data").getJSONArray("totalList").getJSONObject(0).getLongValue("code");

        // 2. Get process instances for the project
        HttpGet instancesRequest = new HttpGet(dsUrl + "/projects/" + projectCode + "/process-instances?pageNo=1&pageSize=100");
        instancesRequest.addHeader("token", token);
        CloseableHttpResponse instancesResponse = httpClient.execute(instancesRequest);
        String instancesResponseString = EntityUtils.toString(instancesResponse.getEntity());
        JSONObject instancesData = JSON.parseObject(instancesResponseString);

        if (instancesData.getIntValue("code") != 0) {
            throw new Exception("DS API error (process-instances): " + instancesData.getString("msg"));
        }

        JSONArray instanceList = instancesData.getJSONObject("data").getJSONArray("totalList");
        stats.put("total", instancesData.getJSONObject("data").getIntValue("total"));
        stats.put("recent_instances", instanceList.toJavaList(Map.class));

        for (int i = 0; i < instanceList.size(); i++) {
            JSONObject instance = instanceList.getJSONObject(i);
            String state = instance.getString("state");
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

    public Map<String, Object> getWorkflowInstances(Long projectCode, String state, int pageNo, int pageSize, String startDate, String endDate) throws Exception {
        String path = (projectCode != null)
                ? "/projects/" + projectCode + "/process-instances"
                : "/process-instances";
        URIBuilder builder = new URIBuilder(dsUrl + path);
        builder.setParameter("pageNo", String.valueOf(pageNo));
        builder.setParameter("pageSize", String.valueOf(pageSize));
        if (state != null && !state.isEmpty()) {
            builder.setParameter("stateType", state);
        }
        if (startDate != null) {
            builder.setParameter("startDate", startDate);
        }
        if (endDate != null) {
            builder.setParameter("endDate", endDate);
        }

        HttpGet request = new HttpGet(builder.build());
        request.addHeader("token", token);
        CloseableHttpResponse response = httpClient.execute(request);
        String responseString = EntityUtils.toString(response.getEntity());
        JSONObject data = JSON.parseObject(responseString);

        if (data.getIntValue("code") != 0) {
            throw new Exception("DS API error (process-instances): " + data.getString("msg"));
        }

        return data.getJSONObject("data").getInnerMap();
    }

    public Map<String, Object> getTaskInstances(Long projectCode, String state, int pageNo, int pageSize, String startDate, String endDate) throws Exception {
        String path = (projectCode != null)
                ? "/projects/" + projectCode + "/task-instances"
                : "/task-instances";
        URIBuilder builder = new URIBuilder(dsUrl + path);
        builder.setParameter("pageNo", String.valueOf(pageNo));
        builder.setParameter("pageSize", String.valueOf(pageSize));
        if (state != null && !state.isEmpty()) {
            builder.setParameter("stateType", state);
        }
        if (startDate != null) {
            builder.setParameter("startDate", startDate);
        }
        if (endDate != null) {
            builder.setParameter("endDate", endDate);
        }

        HttpGet request = new HttpGet(builder.build());
        request.addHeader("token", token);
        CloseableHttpResponse response = httpClient.execute(request);
        String responseString = EntityUtils.toString(response.getEntity());
        JSONObject data = JSON.parseObject(responseString);

        if (data.getIntValue("code") != 0) {
            throw new Exception("DS API error (task-instances): " + data.getString("msg"));
        }

        return data.getJSONObject("data").getInnerMap();
    }

    public Map<String, Object> getWorkflowInstanceDetail(Long projectCode, Integer instanceId) throws Exception {
        // 1. Get process instance detail
        HttpGet instanceRequest = new HttpGet(dsUrl + "/projects/" + projectCode + "/process-instances/" + instanceId);
        instanceRequest.addHeader("token", token);
        CloseableHttpResponse instanceResponse = httpClient.execute(instanceRequest);
        String instanceResponseString = EntityUtils.toString(instanceResponse.getEntity());
        JSONObject instanceData = JSON.parseObject(instanceResponseString);
        if (instanceData.getIntValue("code") != 0) {
            throw new Exception("DS API error (process-instance detail): " + instanceData.getString("msg"));
        }
        Map<String, Object> result = instanceData.getJSONObject("data").getInnerMap();

        // 2. Get task list for the instance
        HttpGet tasksRequest = new HttpGet(dsUrl + "/projects/" + projectCode + "/task-instances?processInstanceId=" + instanceId + "&pageNo=1&pageSize=1000");
        tasksRequest.addHeader("token", token);
        CloseableHttpResponse tasksResponse = httpClient.execute(tasksRequest);
        String tasksResponseString = EntityUtils.toString(tasksResponse.getEntity());
        JSONObject tasksData = JSON.parseObject(tasksResponseString);
        if (tasksData.getIntValue("code") != 0) {
            throw new Exception("DS API error (task-instances): " + tasksData.getString("msg"));
        }
        result.put("tasks", tasksData.getJSONObject("data").getJSONArray("totalList").toJavaList(Map.class));

        return result;
    }

    public String getTaskInstanceLog(Integer taskInstanceId) throws Exception {
        HttpGet logRequest = new HttpGet(dsUrl + "/log/detail?taskInstanceId=" + taskInstanceId + "&skipLineNum=0&limit=10000");
        logRequest.addHeader("token", token);
        CloseableHttpResponse logResponse = httpClient.execute(logRequest);
        String logResponseString = EntityUtils.toString(logResponse.getEntity());
        JSONObject logData = JSON.parseObject(logResponseString);
        if (logData.getIntValue("code") != 0) {
            throw new Exception("DS API error (log detail): " + logData.getString("msg"));
        }
        return logData.getString("data");
    }

    private void resolveFilePlaceholdersRecursive(Object object) {
        if (object instanceof Map) {
            Map<String, Object> map = (Map<String, Object>) object;
            for (Map.Entry<String, Object> entry : map.entrySet()) {
                if (entry.getValue() instanceof String) {
                    String str = (String) entry.getValue();
                    if (str.matches("\\$FILE\\{\"([^}]+)\"\\}")) {
                        String filename = str.substring(7, str.length() - 2);
                        if (!filename.startsWith("./uploads/")) {
                            entry.setValue("$FILE{\"./uploads/" + filename + "\"}");
                        }
                    }
                } else {
                    resolveFilePlaceholdersRecursive(entry.getValue());
                }
            }
        } else if (object instanceof List) {
            List<Object> list = (List<Object>) object;
            for (int i = 0; i < list.size(); i++) {
                Object element = list.get(i);
                if (element instanceof String) {
                    String str = (String) element;
                    if (str.matches("\\$FILE\\{\"([^}]+)\"\\}")) {
                        String filename = str.substring(7, str.length() - 2);
                        if (!filename.startsWith("./uploads/")) {
                            list.set(i, "$FILE{\"./uploads/" + filename + "\"}");
                        }
                    }
                } else {
                    resolveFilePlaceholdersRecursive(element);
                }
            }
        }
    }
}
