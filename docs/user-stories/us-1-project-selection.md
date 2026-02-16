# US-1: Project Selection on Launch

On app open, the user sees a project selection screen.

- List of recent projects displayed as paths (persisted locally as MRU)
- Recent projects list (MRU from `~/.pita/store.json`)
- Miller columns file browser rooted at runtime home dir (dev mode can use seeded memfs fixtures)
- "New Folder" action for folder context (Ctrl+N), with input prompt and Esc dismissal
- "Create Project" action (Ctrl+P) with explicit confirmation, then `git init`
- Tab focus toggle between Recent and Miller panels
- Opening a non-git folder shows a status message instead of opening
- Project selector is shown in a centered panel with comfortable margins
- A project is a folder that is a git repository
