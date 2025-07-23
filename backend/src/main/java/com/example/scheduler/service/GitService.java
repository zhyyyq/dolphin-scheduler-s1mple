package com.example.scheduler.service;

import org.eclipse.jgit.api.Git;
import org.eclipse.jgit.api.errors.GitAPIException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;

@Service
public class GitService {

    @Value("${workflow.repo.dir}")
    private String workflowRepoDir;

    private Git git;

    public void init() throws IOException, GitAPIException {
        File repoDir = new File(workflowRepoDir);
        if (!repoDir.exists()) {
            Git.init().setDirectory(repoDir).call();
        }
        git = Git.open(repoDir);
    }

    public void gitCommit(String filename, String message) throws GitAPIException, IOException {
        if (git == null) {
            init();
        }
        git.add().addFilepattern(filename).call();
        git.commit().setMessage(message).call();
    }

    // ... other git methods
}
