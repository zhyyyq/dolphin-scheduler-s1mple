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
import org.eclipse.jgit.revwalk.filter.RevFilter;
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
        // Using "." is more robust as it stages all changes in the working directory,
        // avoiding issues with relative paths and the current working directory of the process.
        git.add().addFilepattern(".").call();
        git.commit().setMessage(message).call();
    }

    public void gitRmAndCommit(String filename, String message) throws GitAPIException, IOException {
        if (git == null) {
            init();
        }
        // The rm command correctly uses the filepattern relative to the repo root.
        // However, to be consistent and robust, we ensure all changes are staged.
        git.rm().addFilepattern(filename).call();
        git.add().addFilepattern(".").call(); // Stage the removal
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
            if (commit.getParentCount() == 0) {
                throw new IllegalStateException("Cannot get file content from the initial commit.");
            }
            RevCommit parent = revWalk.parseCommit(commit.getParent(0).getId());
            RevTree tree = parent.getTree();
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
                                File file = new File(workflowRepoDir, diff.getOldPath());
                                if (file.exists()) {
                                    continue;
                                }
                                Map<String, Object> fileData = new java.util.HashMap<>();
                                fileData.put("path", diff.getOldPath());
                                fileData.put("commit", commit.getName());
                                fileData.put("author", commit.getAuthorIdent().getName());
                                fileData.put("date", commit.getAuthorIdent().getWhen());
                                fileData.put("message", commit.getFullMessage());
                                fileData.put("filename", diff.getOldPath());
                                String message = commit.getFullMessage();
                                if (message.startsWith("Delete workflow: ")) {
                                    fileData.put("name", message.substring("Delete workflow: ".length()));
                                }
                                deletedFiles.add(fileData);
                            }
                        }
                    }
                }
            }
        }
        return deletedFiles;
    }

    public void restoreFileFromCommit(String path, String commitHash) throws GitAPIException, IOException {
        if (git == null) {
            init();
        }
        git.checkout().setStartPoint(commitHash + "^").addPath(path).call();
        git.commit().setMessage("Restore file " + path + " from commit " + commitHash).call();
    }

    public void revertFileToCommit(String filename, String commitHash) throws GitAPIException, IOException {
        if (git == null) {
            init();
        }
        git.checkout().setStartPoint(commitHash).addPath(filename).call();
        git.commit().setMessage("Revert " + filename + " to commit " + commitHash).call();
    }

    public String getCommitRelationship(String commit1, String commit2) throws IOException, GitAPIException {
        if (git == null) {
            init();
        }
        try (RevWalk revWalk = new RevWalk(git.getRepository())) {
            ObjectId id1 = git.getRepository().resolve(commit1);
            ObjectId id2 = git.getRepository().resolve(commit2);

            if (id1 == null || id2 == null) {
                return "unknown";
            }

            if (id1.equals(id2)) {
                return "equal";
            }

            RevCommit c1 = revWalk.parseCommit(id1);
            RevCommit c2 = revWalk.parseCommit(id2);

            if (revWalk.isMergedInto(c1, c2)) {
                return "behind";
            } else if (revWalk.isMergedInto(c2, c1)) {
                return "ahead";
            } else {
                return "diverged";
            }
        }
    }
}
