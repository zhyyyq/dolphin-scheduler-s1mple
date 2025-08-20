package com.example.scheduler.service;

import com.alibaba.fastjson.JSONObject;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.example.scheduler.dto.ProcessWithTasks;
import com.example.scheduler.enums.WorkflowQueryTimeTypeEnum;
import com.example.scheduler.enums.WorkflowRunningStatusEnum;
import com.example.scheduler.mapper.DiyWorkflowMapper;
import com.example.scheduler.mapper.TDsProcessDefinitionMapper;
import com.example.scheduler.mapper.TDsProcessInstanceMapper;
import com.example.scheduler.mapper.TDsTaskInstanceMapper;
import com.example.scheduler.model.DiyWorkflow;
import com.example.scheduler.model.TDsProcessDefinition;
import com.example.scheduler.model.TDsProcessInstance;
import com.example.scheduler.model.TDsTaskInstance;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.yaml.snakeyaml.Yaml;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.text.SimpleDateFormat;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class MaintainService {
    private static final Logger logger = LoggerFactory.getLogger(MaintainService.class);

    @Autowired
    private TDsTaskInstanceMapper tdsTaskInstanceMapper;

    @Autowired
    private TDsProcessInstanceMapper tDsProcessInstanceMapper;

    @Autowired
    private TDsProcessDefinitionMapper tDsProcessDefinitionMapper;

    @Autowired
    private DiyWorkflowMapper diyWorkflowMapper;

    @Value("${workflow.repo.dir}")
    private String workflowRepoDir;

    public JSONObject getMaintenanceStatus(Long[] projectCodes, String timeType, String[] timeRange)
            throws Exception {
        LambdaQueryWrapper<TDsProcessInstance> processQueryWrapper = new LambdaQueryWrapper<>();
        // Ensure projectCodes is not null and has at least one element
        if (projectCodes != null && projectCodes.length > 0) {
            // Use the .in method with projectCodes
            processQueryWrapper.in(TDsProcessInstance::getProjectCode, Arrays.asList(projectCodes));
        }

        // Format dates
        SimpleDateFormat formatter = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");

        // Parse start and end time from timeRange
        Date startTime = formatter.parse(timeRange[0]);
        Date endTime = formatter.parse(timeRange[1]);

        // Check time type and apply between condition for the appropriate field
        if (Integer.parseInt(timeType) == WorkflowQueryTimeTypeEnum.START_TIME.getCode()) {
            processQueryWrapper.between(TDsProcessInstance::getStartTime, startTime, endTime);
        } else if (Integer.parseInt(timeType) == WorkflowQueryTimeTypeEnum.SCHEDULE_TIME.getCode()) {
            // 如果schedule_time 为 null 则 start_time 视为 schedule time
            processQueryWrapper.between(TDsProcessInstance::getScheduleTime, startTime, endTime).or(
                    i -> i.isNull(TDsProcessInstance::getScheduleTime).between(TDsProcessInstance::getStartTime, startTime, endTime)
            );
        }

        // Execute the query
        List<TDsProcessInstance> tDsProcessInstanceList = this.tDsProcessInstanceMapper.selectList(processQueryWrapper);

        // 查询关联的调度任务
        Integer[] instanceIds = tDsProcessInstanceList.stream()
                .map(TDsProcessInstance::getId)
                .toArray(Integer[]::new);
        List<TDsTaskInstance> tDsTaskInstanceList = new ArrayList<>();
        if (instanceIds.length > 0) {
            LambdaQueryWrapper<TDsTaskInstance> tDsTaskInstanceQueryWrapper = new LambdaQueryWrapper<TDsTaskInstance>()
                    .in(TDsTaskInstance::getProcessInstanceId, Arrays.asList(instanceIds));
            tDsTaskInstanceList = this.tdsTaskInstanceMapper
                    .selectList(tDsTaskInstanceQueryWrapper);
        }


        // bind task to instance
        // Create a map from process ID to a list of associated task instances
        Map<Integer, List<TDsTaskInstance>> processToTasks = tDsTaskInstanceList.stream()
                .collect(Collectors.groupingBy(TDsTaskInstance::getProcessInstanceId));

        // Create a list of ProcessWithTasks objects
        List<ProcessWithTasks> processesWithTasks = new ArrayList<>();

        for (TDsProcessInstance process : tDsProcessInstanceList) {
            Integer processId = process.getId();
            List<TDsTaskInstance> tasks = processToTasks.getOrDefault(processId, new ArrayList<>());
            processesWithTasks.add(new ProcessWithTasks(process, tasks));
        }
        JSONObject resultMap = new JSONObject();
        // Add the result to the JSONObject
        resultMap.put("processListWithTasks", processesWithTasks);
        // stats calculate
        // taskStats: { statusDesc: string; count: number; statusCode: number }[];
        // workflowStats: { statusDesc: string; count: number; statusCode: number }[];
        // processList unique
        // Create workflowStats using groupingBy and counting
        List<Map<String, Object>> workflowStats = processesWithTasks.stream()
                .map(ProcessWithTasks::getProcessInstance)
                .map(TDsProcessInstance::getState)
                .collect(Collectors.groupingBy(
                        statusCode -> WorkflowRunningStatusEnum.values()[statusCode].getDesc(),
                        Collectors.counting()))
                .entrySet().stream()
                .map(entry -> {
                    Map<String, Object> stat = new HashMap<>();
                    stat.put("statusDesc", entry.getKey());
                    stat.put("count", entry.getValue());
                    stat.put("statusCode",
                            WorkflowRunningStatusEnum.valueOf(entry.getKey().toUpperCase().replace(" ", "_")).getCode());
                    return stat;
                })
                .collect(Collectors.toList());
        resultMap.put("workflowStats", workflowStats);
        List<Map<String, Object>> taskStats = processesWithTasks.stream()
                .map(ProcessWithTasks::getTaskInstances) // Returns List<TDsTaskInstance>
                .flatMap(Collection::stream) // Convert List<TDsTaskInstance> to Stream<TDsTaskInstance>
                .map(TDsTaskInstance::getState) // Map to the state of each task instance
                .collect(Collectors.groupingBy(
                        statusCode -> WorkflowRunningStatusEnum.values()[statusCode].getDesc(),
                        Collectors.counting()))
                .entrySet().stream()
                .map(entry -> {
                    Map<String, Object> stat = new HashMap<>();
                    stat.put("statusDesc", entry.getKey());
                    stat.put("count", entry.getValue());
                    stat.put("statusCode",
                            WorkflowRunningStatusEnum.valueOf(entry.getKey().toUpperCase().replace(" ", "_")).getCode());
                    return stat;
                })
                .collect(Collectors.toList());
        resultMap.put("taskStats", taskStats);
        // processList
        Long[] processDefinitionCodeList = processesWithTasks.stream()
                .map(ProcessWithTasks::getProcessInstance)  // Get ProcessInstance
                .map(TDsProcessInstance::getProcessDefinitionCode)  // Get processDefinitionCode (Long)
                .toArray(Long[]::new); // Convert to Integer array
        logger.info("processDefinitionCodeList{}", Arrays.toString(processDefinitionCodeList));
        List<TDsProcessDefinition> tDsProcessDefinitionList = new ArrayList<>();
        if (processDefinitionCodeList.length > 0) {
            tDsProcessDefinitionList = this.tDsProcessDefinitionMapper.selectList(
                    new LambdaQueryWrapper<TDsProcessDefinition>().in(TDsProcessDefinition::getCode, Arrays.asList(processDefinitionCodeList)));
        }

        logger.info(tDsProcessDefinitionList.toString());
        resultMap.put("processDefinitionList", tDsProcessDefinitionList);
        return resultMap;
    }

    public JSONObject getWorkflowDetails(Long processDefinitionCode) throws IOException {
        DiyWorkflow workflow = diyWorkflowMapper.selectOne(new LambdaQueryWrapper<DiyWorkflow>().eq(DiyWorkflow::getProcessDefinitionCode, processDefinitionCode));

        if (workflow == null) {
            throw new RuntimeException("workflow does not exist!");
        }
        String filename = workflow.getId() + ".yaml";
        Path filePath = Paths.get(workflowRepoDir, filename);
        if (!Files.exists(filePath)) {
            throw new RuntimeException("Workflow file not found, though a DB record exists.");
        }
        String content = new String(Files.readAllBytes(filePath));
        Yaml yaml = new Yaml();
        Map<String, Object> data = yaml.load(content);
        JSONObject res = new JSONObject();
        res.putAll((JSONObject) JSONObject.toJSON(workflow));
        res.put("yaml_content", data);
        return res;
    }
}
