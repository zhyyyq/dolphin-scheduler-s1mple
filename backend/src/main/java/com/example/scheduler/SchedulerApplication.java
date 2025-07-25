package com.example.scheduler;

import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.jdbc.core.JdbcTemplate;

import java.sql.Statement;

@SpringBootApplication
public class SchedulerApplication {

    public static void main(String[] args) {
        SpringApplication.run(SchedulerApplication.class, args);
    }

    @Bean
    public ApplicationRunner runner(JdbcTemplate jdbcTemplate) {
        return args -> {
            try (Statement statement = jdbcTemplate.getDataSource().getConnection().createStatement()) {
                statement.executeUpdate("CREATE TABLE IF NOT EXISTS workflows (" +
                        "uuid VARCHAR(255) PRIMARY KEY," +
                        "name VARCHAR(255)," +
                        "online_version VARCHAR(255)," +
                        "locations VARCHAR(255)" +
                        ")");
            }
        };
    }
}
