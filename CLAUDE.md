# RipWatch: agent rules

RipWatch fine-tunes a YOLO11-seg model to detect rip currents in beach video and paints them red. Judges see only a pre-recorded 3-minute video. There is no backend and no live model.

## Rules

- Read every file in `notes/` before starting any task.
- Folder ownership:
  - The web person edits only `web/`, except `web/public/data/`, which only the ML person writes.
  - The ML person edits only `ml/` and `web/public/data/`.
  - Never edit the other person's folder.
- Each person appends only to their own log: `notes/web.md` or `notes/ml.md`. Never edit the other person's log.
- `notes/contract.md` defines the data format. Do not change it without saying so in your log and flagging it to the user.
- At the end of every task, append to your own log: date/time, what was built, files touched, what's next, any blockers.
- Always `git pull` before starting. Keep commits small.
- No backend, no API routes, no auth. Everything is static files.
