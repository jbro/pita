# US-1: Project Selection on Launch

On app open, the user sees a project selection screen.

- List of recent projects displayed as paths (persisted locally as MRU)
- Recent projects list (MRU from `~/.pita/store.json`)
- Miller columns file browser rooted at home (dev mode uses seeded memfs fixtures)
- "New Folder" action in Miller context (Ctrl+N)
- "Create Project" action in Miller context (Ctrl+P) with explicit confirmation, then `git init`
- Tab focus toggle between Recent and Miller panels
- A project is a folder that is a git repository
