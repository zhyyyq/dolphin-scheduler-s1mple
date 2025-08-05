package com.example.scheduler.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.springframework.lang.Nullable;

import java.util.List;
import java.util.Map;

@Mapper
public interface TaskInstanceMapper {

  List<Map<String, Object>> queryTaskInstanceStatsByScheduleTime(
      @Param("startTime") String startTime,
      @Param("endTime") String endTime,
      @Nullable @Param("projectCodes") long[] projectCodes);

  List<Map<String, Object>> queryTaskInstanceStatsByStartTime(
      @Param("startTime") String startTime,
      @Param("endTime") String endTime,
      @Nullable @Param("projectCodes") long[] projectCodes);
}
