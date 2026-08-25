# Errors

Command failures and integration errors.

---

## [ERR-20260825-003] offline-installer-layout

**Logged**: 2026-08-25T06:18:00+08:00
**Priority**: medium
**Status**: resolved
**Area**: tests

### Summary
The root installer assumed the repository's `skills/` directory and could not start from the flat offline delivery package.

### Error
`ERR_MODULE_NOT_FOUND: .../offline-package-test/skills/second-brain-hub/scripts/install.mjs`

### Context
- Operation: built the offline ZIP layout and invoked its root `install.mjs`.
- The package deliberately contains six top-level Skill folders, while the repository nests them in `skills/`.

### Suggested Fix
Resolve the Hub installer from either layout and add a portable-entry regression test.

### Metadata
- Reproducible: yes
- Related Files: `install.mjs`; `scripts/build-offline-install-package.ps1`; `tests/install-script.test.mjs`
- Pattern-Key: build.package-layout

### Resolution
- **Resolved**: 2026-08-25T06:18:00+08:00
- **Notes**: Root entry now detects both layouts; the portable-entry test covers the repository layout and the offline package smoke test covers the flat layout.

---

## [ERR-20260825-002] install-script-structured-errors

**Logged**: 2026-08-25T06:15:00+08:00
**Priority**: medium
**Status**: resolved
**Area**: tests

### Summary
The installer returned a JavaScript stack trace instead of its JSON result for an unsafe skills directory.

### Error
`Refusing to use a filesystem root or user home directory for --skills-dir`

### Context
- Operation: installer safety test using a filesystem root as `--skills-dir`.
- The path guard ran outside the installer command's structured error boundary.

### Suggested Fix
Wrap user-provided directory validation in the command boundary and return the standard `need-input` JSON payload.

### Metadata
- Reproducible: yes
- Related Files: `skills/second-brain-hub/scripts/install.mjs`; `tests/install-script.test.mjs`
- Pattern-Key: runtime.structured-errors

### Resolution
- **Resolved**: 2026-08-25T06:15:00+08:00
- **Notes**: Wrapped both skills and knowledge-base path guards; the regression test now asserts the JSON response and exit code.

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
