package com.example.scheduler.mapper;

import com.example.scheduler.model.DiySchedulerFunction;
import org.apache.ibatis.annotations.*;

import java.util.List;
import java.util.Optional;

@Mapper
public interface DiySchedulerFunctionMapper {

    @Select("SELECT * FROM diy_scheduler_function WHERE function_name = #{functionName} AND deleted = false")
    Optional<DiySchedulerFunction> findByFunctionNameAndDeletedFalse(@Param("functionName") String functionName);

    @Select("SELECT * FROM diy_scheduler_function WHERE function_name = #{functionName}")
    Optional<DiySchedulerFunction> findByFunctionName(@Param("functionName") String functionName);

    @Select("SELECT * FROM diy_scheduler_function WHERE deleted = false")
    List<DiySchedulerFunction> findAllByDeletedFalse();

    @Select("SELECT * FROM diy_scheduler_function WHERE function_id = #{functionId} AND deleted = false")
    Optional<DiySchedulerFunction> findByIdAndDeletedFalse(@Param("functionId") Long functionId);

    @Select("SELECT * FROM diy_scheduler_function WHERE function_id = #{functionId}")
    Optional<DiySchedulerFunction> findById(@Param("functionId") Long functionId);

    @Select("SELECT * FROM diy_scheduler_function")
    List<DiySchedulerFunction> findAll();

    @Insert("INSERT INTO diy_scheduler_function(function_name, function_content, deleted, content_hash) " +
            "VALUES(#{functionName}, #{functionContent}, #{deleted}, #{contentHash})")
    @Options(useGeneratedKeys = true, keyProperty = "functionId")
    void save(DiySchedulerFunction function);

    @Update("UPDATE diy_scheduler_function SET function_name = #{functionName}, function_content = #{functionContent}, " +
            "deleted = #{deleted}, content_hash = #{contentHash} WHERE function_id = #{functionId}")
    void update(DiySchedulerFunction function);
}
