package com.example.scheduler.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.springframework.lang.Nullable;

import java.util.List;
import java.util.Map;

@Mapper
public interface WorkflowInstanceMapper {

  List<Map<String, Object>> queryProcessInstanceStatsByScheduleTime(
      @Param("startTime") String startTime,
      @Param("endTime") String endTime,
      @Nullable @Param("projectCodes") long[] projectCodes);
  
 Map<String, Object> queryProcessInstanceByScheduleTimePagination(
      @Param("startTime") String startTime,
      @Param("endTime") String endTime,
      @Param("pageSize") Long pageSize,
      @Param("currentPage") Long currentPage,
      @Nullable @Param("status") String status,
      @Nullable @Param("projectCodes") long[] projectCodes);

  List<Map<String, Object>> queryProcessInstanceStatsByStartTime(
      @Param("startTime") String startTime,
      @Param("endTime") String endTime,
      @Nullable @Param("projectCodes") long[] projectCodes);
  
  
}
