package com.example.scheduler.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.springframework.lang.Nullable;

import java.util.List;

@Mapper
public interface WorkflowInstanceMapper {

  List<Object[]> queryProcessInstanceByScheduleTime(
      @Param("startTime") String startTime,
      @Param("endTime") String endTime,
      @Nullable @Param("status") String status,
      @Nullable @Param("projectCodes") long[] projectCodes);

  List<Object[]> queryProcessInstanceByStartTime(
      @Param("startTime") String startTime,
      @Param("endTime") String endTime,
      @Nullable @Param("status") String status,
      @Nullable @Param("projectCodes") long[] projectCodes);
}
