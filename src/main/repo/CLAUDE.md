# Repository Management

Git operations and file tree management via `simple-git`.

## Architecture
- **RepoManager** — scans `projectsRoot` and `additionalPaths` for directories, provides git operations (commits, branches, status), file tree with ignore filtering
- Supports `~` expansion in paths
- File tree uses `.gitignore` + hardcoded excludes (node_modules, dist, .git, .env, etc.)
- Watches `projectsRoot` and additional root paths for new/removed repos, individual repo file trees
- `additionalPaths` support two types: `root` (scanned like projectsRoot) and `repo` (added directly)

## Rules
- All git operations are async via `simple-git`
- `listRepos()` uses private `scanDirectory()` helper for DRY directory scanning. Returns repos from projectsRoot + additionalPaths, with duplicate detection by absolute path. Each repo has a `source` field.
- Commit log: branch-specific shows `main..<branch>` (only branch-unique commits), main/master shows all
- File tree sorted: folders first, then files, alphabetically
- `readFile(repoPath, filePath)` — reads file content with path traversal protection
- `getFileDiff(repoPath, filePath)` — returns `{ original, modified }` for working tree diff
- `getCommitDiff(repoPath, commitHash)` — returns `CommitDiffFile[]` with file contents at commit vs parent

## Watch Out
- Watchers use debounce (300ms for root, 500ms for file trees) to avoid event floods
- `dispose()` must clean up all watchers and timers
- `getFiles()` has a 100-file limit for performance
- `unwatchRepoFileTree` is called when closing a repo tab
