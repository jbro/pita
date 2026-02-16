# US-1: Project Selection Screen — Design

## Goal

On app launch, present a project selection screen with recent projects and a filesystem browser. The user can open an existing git repo or create a new project.

## Layout

Two-panel layout with a toolbar and help bar.

**Left panel — Recent Projects:**
- MRU list sorted by last opened (most recent first)
- Each entry shows the project path
- Top entry is pre-selected on load
- Click opens the project immediately
- Up/Down arrows navigate, Enter opens

**Right panel — Miller Columns File Browser:**
- Starts at `$HOME`
- Each column shows a directory's contents
- Up/Down arrows navigate within the current column
- Right arrow enters the selected folder (adds a column)
- Left arrow goes back one column
- Git repos show a branch icon and are selectable
- Non-repo folders are dimmed (navigable but not openable as projects)

**Toolbar (bottom, Miller panel context):**
- **New Folder** (Ctrl+N) — prompts for a name, creates the folder, Esc dismisses
- **Create Project** (Ctrl+P) — confirmation dialog, runs git init in the selected folder, opens the project on confirm

**Help bar (bottom-most):**
- Shows keyboard shortcuts relevant to the currently focused panel
- Updates as focus changes

No command palette in this view. Shortcut hints on the UI cover discoverability.

## Focus Model

- Tab toggles focus between the Recent panel and the Miller panel
- Ctrl+N and Ctrl+P only work when the Miller panel has focus
- Both require user confirmation before acting

## Keyboard Summary

### Recent panel

| Shortcut | Action |
|---|---|
| Up/Down | Navigate list |
| Enter | Open selected project |
| Tab | Move focus to Miller panel |

### Miller panel

| Shortcut | Action |
|---|---|
| Up/Down | Navigate within current column |
| Right | Enter selected folder |
| Left | Go back one column |
| Enter | Open project (git repos only) |
| Ctrl+N | New Folder (prompts for name) |
| Ctrl+P | Create Project (confirmation, git init, open) |
| Tab | Move focus to Recent panel |

### New Folder prompt

| Shortcut | Action |
|---|---|
| Enter | Confirm name |
| Esc | Dismiss |

## Data & Persistence

**MRU store** at `~/.pita/store.json`:

```json
{
  "recentProjects": [
    { "path": "/home/user/my-project", "pathHash": "a1b2c3d4", "lastOpened": "2026-02-16T20:00:00Z" }
  ]
}
```

- `pathHash` matches the key used for `~/.pita/projects/<pathHash>/`
- Updated when a project is opened
- Stale entries (missing folder or no longer a git repo) filtered out on load

**Git repo detection:** check for `.git/` directory or `.git` file (worktrees). Done on the fly as Miller columns render each folder.

## Dev Mode

In `bun run dev`, the entire project selection screen operates against a memfs instance instead of the real filesystem. A fixture file seeds a realistic home directory with git repos and plain folders. The MRU store is also seeded in memfs.

## Component Architecture

### Renderer

```
ProjectSelectionScreen
├── RecentProjectsList
│   └── RecentProjectItem
├── MillerColumnsView
│   └── MillerColumn
│       └── FolderEntry
├── ProjectToolbar
│   ├── NewFolderButton
│   └── CreateProjectButton
└── ShortcutHelpBar
```

### State (Jotai atoms)

- `recentProjectsAtom` — MRU list
- `millerPathAtom` — array of directory paths (column stack)
- `millerSelectionAtom` — selected index in the active column
- `focusPanelAtom` — `"recent"` or `"miller"`
- `gitRepoStatusCache` — `Map<path, boolean>` to avoid redundant checks

### Main process service

```
FileSystemService(fs)
├── listDirectory(path): { name, isDirectory, isGitRepo }[]
├── createFolder(parentPath, name): void
├── initProject(path): void
├── isGitRepo(path): boolean
```

### IPC calls

- `fs:listDirectory` — directory entries with git status
- `fs:createFolder` — create folder, return success/error
- `fs:initProject` — git init (extensible for future wizard steps)
- `project:open` — update MRU, acquire lock, transition to session workspace
- `project:loadMru` — return MRU list on startup

The renderer never touches the filesystem directly.

## Create Project Flow

Designed to accommodate a wizard or additional steps later:

1. User selects a non-repo folder in Miller columns
2. User presses Ctrl+P or clicks "Create Project"
3. Confirmation dialog: "Create project in /path/to/folder?"
4. On confirm: `fs:initProject` runs git init (future: AGENTS.md wizard, template selection)
5. On success: `project:open` transitions to the session workspace
