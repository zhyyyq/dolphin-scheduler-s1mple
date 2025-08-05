package com.example.scheduler.mapper;

import com.example.scheduler.model.Workflow;
import org.apache.ibatis.annotations.*;

import java.util.List;
import java.util.Optional;

@Mapper
public interface WorkflowMapper {

    @Results(id = "workflowResultMap", value = {
        @Result(property = "uuid", column = "uuid"),
        @Result(property = "name", column = "name"),
        @Result(property = "onlineVersion", column = "online_version"),
        @Result(property = "locations", column = "locations"),
        @Result(property = "projectCode", column = "project_code"),
        @Result(property = "projectName", column = "project_name")
    })
    @Select("SELECT * FROM workflows")
    List<Workflow> findAll();

    @ResultMap("workflowResultMap")
    @Select("SELECT * FROM workflows WHERE name = #{name}")
    Optional<Workflow> findByName(@Param("name") String name);

    @ResultMap("workflowResultMap")
    @Select("SELECT * FROM workflows WHERE name = #{name} AND uuid != #{uuid}")
    Optional<Workflow> findByNameAndUuidNot(@Param("name") String name, @Param("uuid") String uuid);

    @ResultMap("workflowResultMap")
    @Select("SELECT * FROM workflows WHERE uuid = #{uuid}")
    Optional<Workflow> findById(@Param("uuid") String uuid);

    @Insert("INSERT INTO workflows(uuid, name, online_version, locations, project_code, project_name) " +
            "VALUES(#{uuid}, #{name}, #{onlineVersion}, #{locations}, #{projectCode}, #{projectName})")
    void save(Workflow workflow);

    @Update("UPDATE workflows SET name = #{name}, online_version = #{onlineVersion}, locations = #{locations}, " +
            "project_code = #{projectCode}, project_name = #{projectName} WHERE uuid = #{uuid}")
    void update(Workflow workflow);

    @Delete("DELETE FROM workflows WHERE uuid = #{uuid}")
    void deleteById(@Param("uuid") String uuid);
}
