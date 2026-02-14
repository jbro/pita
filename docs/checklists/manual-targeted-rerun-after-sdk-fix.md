# Manual Targeted Rerun Checklist (Post SDK Fix)

Purpose: re-verify previously unclear/high-risk items after SDK startup and queue visibility updates.

## Setup

### S1. Start app in default mode
[x] PASS  [ ] FAIL  [ ] UNCLEAR

Steps:
1. Run `bun run dev`.
2. Watch startup log.

Expected:
- Runtime selection shows `selected=sdk` and `fallback=no`.

Observed (if FAIL/UNCLEAR):
- 

---

## Targeted behavior checks

### C2-R. Enter while running performs steer
[x] PASS  [ ] FAIL  [ ] UNCLEAR

Steps:
1. Send a prompt to start a run.
2. Type `steer test`.
3. Press `Enter` while running.
4. Watch queue badge and timeline/run outcome.

Expected:
- Steer action is queued/processed as steer behavior.
- UI remains consistent.

Observed (if FAIL/UNCLEAR):
- 

### C3-R. Alt+Enter while running queues follow-up
[x] PASS  [ ] FAIL  [ ] UNCLEAR

Steps:
1. Start a run.
2. Type `follow-up test`.
3. Press `Alt+Enter`.
4. Watch queue badge text.

Expected:
- Follow-up action is queued.
- Queue badge shows separate counts (`Steer: X · Follow-up: Y`).

Observed (if FAIL/UNCLEAR):
- 

### F1-R. Idle abort expectation
[x] PASS  [ ] FAIL  [ ] UNCLEAR

Steps:
1. Ensure idle state.
2. Confirm Abort button state.

Expected:
- Abort is disabled while idle.
- No crash, no bad state transitions.

Observed (if FAIL/UNCLEAR):
- 

### G1-R. Overlay backend stability signal
[x] PASS  [ ] FAIL  [ ] UNCLEAR

Steps:
1. Run one full prompt lifecycle (send/steer/follow-up/abort).
2. Watch terminal and devtools console.

Expected:
- No preload/IPC/runtime exceptions.
- No regressions in prompt lifecycle behavior.

Observed (if FAIL/UNCLEAR):
- 

---

## Optional proof capture

### P1. Save runtime selection line
[x] PASS  [ ] FAIL  [ ] UNCLEAR

Observed:
- [pita] Runtime selection: selected=sdk requested=sdk-default stubMode=manual-abort fallback=no

### P2. Save one screenshot of queue badge with separate counts
[ ] PASS  [ ] FAIL  [ ] UNCLEAR

Observed:
- 

---

## Summary

PASS: 6
FAIL: 0
UNCLEAR: 0

Deficits to feed next plan:
1. None from targeted rerun.
2. 
3. 
