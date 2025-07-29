package com.example.scheduler.controller;

import com.alibaba.fastjson.JSONArray;
import com.example.scheduler.service.DsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;


@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private DsService dsService;

    @GetMapping("/list")
    public JSONArray getUsers() throws Exception {
        return dsService.getUsers();
    }
}
