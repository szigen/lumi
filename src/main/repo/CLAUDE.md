# Repository Management

Git operations and file tree management via `simple-git`.

## Architecture
- **RepoManager** — scans `projectsRoot` for directories, provides git operations (commits, branches, status), file tree with ignore filtering
- Supports `~` expansion in paths
- File tree uses `.gitignore` + hardcoded excludes (node_modules, dist, .git, .env, etc.)
- Watches `projectsRoot` for new/removed repos and individual repo file trees

## Rules
- All git operations are async via `simple-git`
- `listRepos()` returns all non-hidden directories in projectsRoot (doesn't require .git)
- Commit log: branch-specific shows `main..<branch>` (only branch-unique commits), main/master shows all
- File tree sorted: folders first, then files, alphabetically

## Watch Out
- Watchers use debounce (300ms for root, 500ms for file trees) to avoid event floods
- `dispose()` must clean up all watchers and timers
- `getFiles()` has a 100-file limit for performance
- `unwatchRepoFileTree` is called when closing a repo tab
