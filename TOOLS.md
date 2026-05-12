<!--
TASK SPEC (070f1b3a-545f-45df-a2e7-b901e655ff3b)
What:
- Change file: TOOLS.md
- Add a retry marker note documenting verification remediation for "no commits on branch".

Verify:
- git log --oneline origin/main..HEAD contains a new retry commit.
- npm test exits 0.
- npm run build exits 0.

Boundaries:
- Do not modify signup/login business logic files.
- Do not modify DB schema/migrations.
- Do not touch protected orchestrator/config docs listed in task instructions.
-->

# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

Add whatever helps you do your job. This is your cheat sheet.
