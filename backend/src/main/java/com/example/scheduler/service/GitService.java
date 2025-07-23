package com.example.scheduler.service;

import org.eclipse.jgit.api.Git;
import org.eclipse.jgit.api.errors.GitAPIException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import org.eclipse.jgit.lib.ObjectId;
import org.eclipse.jgit.lib.ObjectLoader;
import org.eclipse.jgit.revwalk.RevCommit;
import org.eclipse.jgit.revwalk.RevTree;
import org.eclipse.jgit.revwalk.RevWalk;
import org.eclipse.jgit.treewalk.TreeWalk;
import org.eclipse.jgit.treewalk.filter.PathFilter;
import org.eclipse.jgit.diff.DiffEntry;
import org.eclipse.jgit.diff.DiffFormatter;
import java.io.ByteArrayOutputStream;

import javax.annotation.PostConstruct;
import java.io.File;
import java.io.IOException;
import java.util.List;
import java.util.Map;

@Service
public class GitService {

    @Value("${workflow.repo.dir}")
    private String workflowRepoDir;

    private Git git;

    @PostConstruct
    public void init() throws IOException, GitAPIException {
        File repoDir = new File(workflowRepoDir);
        if (!repoDir.exists()) {
            repoDir.mkdirs();
        }

        File gitDir = new File(repoDir, ".git");
        if (!gitDir.exists()) {
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

    public void gitRmAndCommit(String filename, String message) throws GitAPIException, IOException {
        if (git == null) {
            init();
        }
        git.rm().addFilepattern(filename).call();
        git.commit().setMessage(message).call();
    }

    public List<Map<String, Object>> getFileHistory(String filename) throws GitAPIException, IOException {
        if (git == null) {
            init();
        }
        List<Map<String, Object>> history = new java.util.ArrayList<>();
        Iterable<RevCommit> logs = git.log().addPath(filename).call();
        for (RevCommit rev : logs) {
            Map<String, Object> commitData = new java.util.HashMap<>();
            commitData.put("hash", rev.getName());
            commitData.put("author", rev.getAuthorIdent().getName());
            commitData.put("date", rev.getAuthorIdent().getWhen());
            commitData.put("message", rev.getFullMessage());
            history.add(commitData);
        }
        return history;
    }

    public Map<String, Object> getFileAtCommit(String filename, String commitHash) throws GitAPIException, IOException {
        if (git == null) {
            init();
        }
        Map<String, Object> fileData = new java.util.HashMap<>();
        try (RevWalk revWalk = new RevWalk(git.getRepository())) {
            RevCommit commit = revWalk.parseCommit(git.getRepository().resolve(commitHash));
            RevTree tree = commit.getTree();
            try (TreeWalk treeWalk = new TreeWalk(git.getRepository())) {
                treeWalk.addTree(tree);
                treeWalk.setRecursive(true);
                treeWalk.setFilter(PathFilter.create(filename));
                if (!treeWalk.next()) {
                    throw new IllegalStateException("Did not find expected file '" + filename + "' in tree '" + tree.getName() + "'");
                }
                ObjectId objectId = treeWalk.getObjectId(0);
                ObjectLoader loader = git.getRepository().open(objectId);
                fileData.put("content", new String(loader.getBytes()));
            }
        }
        return fileData;
    }

    public Map<String, Object> getCommitDiff(String filename, String commitHash) throws GitAPIException, IOException {
        if (git == null) {
            init();
        }
        Map<String, Object> diffData = new java.util.HashMap<>();
        try (RevWalk revWalk = new RevWalk(git.getRepository())) {
            RevCommit commit = revWalk.parseCommit(git.getRepository().resolve(commitHash));
            RevCommit parent = commit.getParentCount() > 0 ? revWalk.parseCommit(commit.getParent(0).getId()) : null;

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            try (DiffFormatter diffFormatter = new DiffFormatter(out)) {
                diffFormatter.setRepository(git.getRepository());
                diffFormatter.setPathFilter(PathFilter.create(filename));
                List<DiffEntry> diffs = diffFormatter.scan(parent != null ? parent.getTree() : null, commit.getTree());
                for (DiffEntry diff : diffs) {
                    diffFormatter.format(diff);
                }
                diffData.put("diff", out.toString());
            }
        }
        return diffData;
    }

    public String getLatestCommit(String filename) throws GitAPIException, IOException {
        if (git == null) {
            init();
        }
        Iterable<RevCommit> logs = git.log().addPath(filename).setMaxCount(1).call();
        for (RevCommit rev : logs) {
            return rev.getName();
        }
        return null;
    }

    public List<Map<String, Object>> getDeletedFiles() throws GitAPIException, IOException {
        if (git == null) {
            init();
        }
        List<Map<String, Object>> deletedFiles = new java.util.ArrayList<>();
        try (RevWalk revWalk = new RevWalk(git.getRepository())) {
            Iterable<RevCommit> logs = git.log().all().call();
            for (RevCommit commit : logs) {
                if (commit.getParentCount() > 0) {
                    RevCommit parent = revWalk.parseCommit(commit.getParent(0).getId());
                    try (DiffFormatter diffFormatter = new DiffFormatter(new ByteArrayOutputStream())) {
                        diffFormatter.setRepository(git.getRepository());
                        List<DiffEntry> diffs = diffFormatter.scan(parent.getTree(), commit.getTree());
                        for (DiffEntry diff : diffs) {
                            if (diff.getChangeType() == DiffEntry.ChangeType.DELETE) {
                                Map<String, Object> fileData = new java.util.HashMap<>();
                                fileData.put("path", diff.getOldPath());
                                fileData.put("commit", commit.getName());
                                fileData.put("author", commit.getAuthorIdent().getName());
                                fileData.put("date", commit.getAuthorIdent().getWhen());
                                fileData.put("message", commit.getFullMessage());
                                deletedFiles.add(fileData);
                            }
                        }
                    }
                }
            }
        }
        return deletedFiles;
    }
}
