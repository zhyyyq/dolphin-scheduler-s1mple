package com.example.scheduler.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.springframework.lang.Nullable;

import java.util.List;
import java.util.Map;

@Mapper
public interface TaskInstanceMapper {

  List<Map<String, Object>> queryTaskInstanceByScheduleTime(
      @Param("startTime") String startTime,
      @Param("endTime") String endTime,
      @Nullable @Param("projectCodes") long[] projectCodes);

  List<Map<String, Object>> queryTaskInstanceByStartTime(
      @Param("startTime") String startTime,
      @Param("endTime") String endTime,
      @Nullable @Param("projectCodes") long[] projectCodes);
}
