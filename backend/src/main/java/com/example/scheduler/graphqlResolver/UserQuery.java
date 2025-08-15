package com.example.scheduler.graphqlResolver;

import java.util.List;

import org.springframework.stereotype.Component;


import com.example.scheduler.mapper.UserMapper;
import com.example.scheduler.model.User;

import graphql.kickstart.execution.GraphQLQueryResult;

@Component
public class UserQuery implements GraphQLQueryResult {
    private final UserMapper userMapper;
    
    public UserQuery(UserMapper userMapper) {
        this.userMapper = userMapper;
    }
    
    public User getUser(Long id) {
        return userMapper.findById(id);
    }
    
    public List<User> getAllUsers() {
        return userMapper.findAll();
    }

    @Override
    public boolean isAsynchronous() {
      // TODO Auto-generated method stub
      throw new UnsupportedOperationException("Unimplemented method 'isAsynchronous'");
    }

    @Override
    public boolean isBatched() {
      // TODO Auto-generated method stub
      throw new UnsupportedOperationException("Unimplemented method 'isBatched'");
    }
}
