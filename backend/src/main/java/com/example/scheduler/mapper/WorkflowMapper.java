package com.example.scheduler.mapper;

import com.example.scheduler.model.Workflow;
import org.apache.ibatis.annotations.*;

import java.util.List;
import java.util.Optional;

@Mapper
public interface WorkflowMapper {

    @Select("SELECT * FROM workflows WHERE name = #{name}")
    Optional<Workflow> findByName(@Param("name") String name);

    @Select("SELECT * FROM workflows WHERE name = #{name} AND uuid != #{uuid}")
    Optional<Workflow> findByNameAndUuidNot(@Param("name") String name, @Param("uuid") String uuid);

    @Select("SELECT * FROM workflows WHERE uuid = #{uuid}")
    Optional<Workflow> findById(@Param("uuid") String uuid);

    @Select("SELECT * FROM workflows")
    List<Workflow> findAll();

    @Insert("INSERT INTO workflows(uuid, name, online_version, locations, project_code, project_name) " +
            "VALUES(#{uuid}, #{name}, #{onlineVersion}, #{locations}, #{projectCode}, #{projectName})")
    void save(Workflow workflow);

    @Update("UPDATE workflows SET name = #{name}, online_version = #{onlineVersion}, locations = #{locations}, " +
            "project_code = #{projectCode}, project_name = #{projectName} WHERE uuid = #{uuid}")
    void update(Workflow workflow);

    @Delete("DELETE FROM workflows WHERE uuid = #{uuid}")
    void deleteById(@Param("uuid") String uuid);
}
