# US-2: Prompt Composer and Session Interaction

After opening a project, the user sees a screen with a prompt box at the bottom.

- Ctrl+Enter sends the prompt to the active session (no buttons)
- A busy indicator appears while the session is running
- Enter inserts a newline
- While busy:
  - Ctrl+Enter steers the session (sends additional message mid-run)
  - Ctrl+Shift+Enter queues the next prompt (follow-up)
  - Up arrow edits queued prompts
  - Esc aborts the current run and clears the prompt queue
- While idle:
  - Esc clears the prompt
  - Up/Down arrow navigates prompt history
