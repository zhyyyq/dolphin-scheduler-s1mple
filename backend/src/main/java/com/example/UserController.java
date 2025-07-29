package com.example;

import com.example.scheduler.service.DsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private DsService dsService;

    @GetMapping("/list")
    public List<Map<String, Object>> getUsers() throws Exception {
        return dsService.getUsers();
    }
}
