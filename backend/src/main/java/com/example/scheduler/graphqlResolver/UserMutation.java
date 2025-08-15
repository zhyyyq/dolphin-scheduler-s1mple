package com.example.scheduler.graphqlResolver;

import org.springframework.stereotype.Component;


import com.example.scheduler.mapper.UserMapper;
import com.example.scheduler.model.User;

import graphql.kickstart.tools.GraphQLMutationResolver;

@Component
public class UserMutation implements GraphQLMutationResolver {
    private final UserMapper userMapper;
    
    public UserMutation(UserMapper userMapper) {
        this.userMapper = userMapper;
    }
    
    public User createUser(String name, String email) {
        User user = new User();
        user.setName(name);
        user.setEmail(email);
        userMapper.insert(user);
        return user;
    }
    
    public User updateUser(Long id, String name, String email) {
        User user = userMapper.findById(id);
        if (user == null) {
            throw new RuntimeException("User not found");
        }
        if (name != null) user.setName(name);
        if (email != null) user.setEmail(email);
        userMapper.update(user);
        return user;
    }
    
    public Boolean deleteUser(Long id) {
        userMapper.delete(id);
        return true;
    }
}