# Project Context Tree Design

## Summary

Replace the flat file list in Project Context with a real tree view that supports drag & drop to terminal.

## Requirements

- **Nested tree view** - Folders expand/collapse with proper indentation
- **Gitignore filtering** - Hide node_modules, .git, dist, build, .DS_Store and .gitignore patterns
- **Single-click toggle** - Click folder to expand/collapse
- **Drag & drop to terminal** - Drag file/folder, drop on any terminal, relative path gets pasted
- **Multi-terminal support** - Path goes to whichever terminal receives the drop

## Implementation

### Backend (Main Process)

- New IPC handler: `getFileTree(repoPath)` returns nested tree structure
- Recursive directory traversal with gitignore filtering
- Returns: `{ name, path, type, children? }[]`

### Frontend (Renderer)

- Recursive `TreeNode` component
- Native HTML5 drag & drop API
- Terminal `onDrop` handler writes path to pty

## Out of Scope

- File preview on click
- Multi-select
- Context menu actions
