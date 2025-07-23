package com.example.scheduler.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class FileService {

    @Value("${workflow.repo.dir}/uploads")
    private String uploadDir;

    public Map<String, String> saveUploadedFile(MultipartFile file) throws IOException {
        Path uploadPath = Paths.get(uploadDir);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }
        Path filePath = uploadPath.resolve(file.getOriginalFilename());
        Files.copy(file.getInputStream(), filePath);
        Map<String, String> result = new HashMap<>();
        result.put("filename", file.getOriginalFilename());
        result.put("path", filePath.toString());
        return result;
    }

    public List<Map<String, Object>> listUploadedFiles() throws IOException {
        Path uploadPath = Paths.get(uploadDir);
        if (!Files.exists(uploadPath)) {
            return new ArrayList<>();
        }
        return Files.list(uploadPath)
                .map(path -> {
                    try {
                        Map<String, Object> fileInfo = new HashMap<>();
                        fileInfo.put("filename", path.getFileName().toString());
                        fileInfo.put("size", Files.size(path));
                        fileInfo.put("last_modified", Files.getLastModifiedTime(path).toMillis() / 1000);
                        return fileInfo;
                    } catch (IOException e) {
                        return null;
                    }
                })
                .filter(map -> map != null)
                .collect(Collectors.toList());
    }

    public Resource downloadFile(String filename) throws MalformedURLException {
        Path filePath = Paths.get(uploadDir).resolve(filename).normalize();
        Resource resource = new UrlResource(filePath.toUri());
        if (resource.exists()) {
            return resource;
        } else {
            throw new RuntimeException("File not found " + filename);
        }
    }
}
