package com.example.scheduler.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.springframework.lang.Nullable;

import java.util.List;
import java.util.Map;

@Mapper
public interface WorkflowInstanceMapper {

  List<Map<String, Object>> queryProcessInstanceByScheduleTime(
      @Param("startTime") String startTime,
      @Param("endTime") String endTime,
      @Nullable @Param("projectCodes") long[] projectCodes);

  List<Map<String, Object>> queryProcessInstanceByStartTime(
      @Param("startTime") String startTime,
      @Param("endTime") String endTime,
      @Nullable @Param("projectCodes") long[] projectCodes);
}
