# Errors

Command failures and integration errors.

---

## [ERR-20260816-001] obsidian-cli-path

**Logged**: 2026-08-16T00:00:00+08:00
**Priority**: low
**Status**: pending
**Area**: tools

### Summary
Obsidian CLI did not resolve a vault note when a path containing Chinese folder names was supplied with backslash separators.

### Error
`Error: File "📂 项目\\第二大脑体系搭建\\02-系统设计\\对接ima知识库-ima-skills能力梳理与集成指南_2026-08-16.md" not found.`

### Context
- Operation: read a note returned by a prior `obsidian search` result.
- The note was found by search; the direct read used Windows backslash separators.

### Suggested Fix
Use the exact path returned by search with forward-slash separators, or resolve the file through the vault filesystem when CLI path parsing is unreliable.

### Metadata
- Reproducible: unknown
- Related Files: references/obsidian-cli/SKILL.md
- Pattern-Key: fs.no-such-file

---
