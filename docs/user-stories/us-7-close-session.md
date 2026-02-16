# US-7: Close Session

The user wants to close the current session.

- Ctrl+W triggers a confirmation dialog
- If confirmed, the session is archived (persisted but no longer active)
- The next open session receives focus
- If no other sessions exist, the view shows an empty prompt (like a new session) but a session is only created once the user sends a prompt
- In mission control (US-4), pressing Delete or Backspace on a selected session triggers the same confirmation and archive flow
