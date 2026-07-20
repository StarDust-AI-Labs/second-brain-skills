# 🧠 Second Brain · Skill Ecosystem

> An AI Agent knowledge management skill system built on Tiago Forte's *Building a Second Brain* — upgrading "knowledge recording" into "knowledge creation", powered by Obsidian skills to fully manage your digital notes.

---

## Overview

This project engineers the methodologies from *Building a Second Brain* — the CODE framework, PARA organizing system, Progressive Summarization, Twelve Favorite Problems, and the **Hemingway Bridge** — into a Skill system that AI Agents can invoke directly. `second-brain-hub` serves as the single entry point, housing 9 methodology capability modules and 5 Obsidian tool Skills. Users simply say "capture this idea", "save this webpage", "distill to L2", or "diagnose why I'm collecting but never creating" — the Agent handles intent routing, contract orchestration, gate checks, and knowledge writing automatically. Compatible with Claude Code, Codex, Cursor, Coze, WorkBuddy, and other major Agent platforms.

**Core philosophy**: The endpoint of knowledge management is not collecting — it's creating.

![Second Brain Concept Poster](docs/第二大脑概念海报.png)

---

## Copy-Paste Prompt for Other Users

Send the following prompt directly to your agent. No technical background needed — the agent guides you step by step in plain language: it detects whether this is a first install or an update, syncs the Skills to the right directory, and helps you choose how to store your knowledge base (connect an existing Obsidian vault, install Obsidian and create a new vault, or use a plain folder):

```text
Please help me install and set up the "Second Brain" knowledge management system. Talk to me in plain language throughout, and ask me only one question at a time. Before running any command or modifying any file, explain what you are about to do and get my consent first. Never ask me to type commands or edit files by hand.

Follow these steps:

0. Detect the environment and determine the Skill installation target directory:
   - Claude Code → copy from skills/ to .claude/skills/
   - Codex → copy from skills/ to .agents/skills/
   - Cursor → copy from skills/ to .cursor/skills/
   - Coze (扣子) → copy from skills/ to .coze/skills/
   - WorkBuddy → copy from skills/ to .workbuddy/skills/
   - Codeium / other agents → look up that agent's skills convention directory; if not found, ask me
   Tell me the detection result and target directory in one sentence before continuing. The top-level skills/ directory is the single source of truth; all installations copy from it.

1. Detect any existing installation:
   - Check whether `second-brain-hub/SKILL.md` exists in the target skills directory, and whether `defuddle`, `obsidian-markdown`, `obsidian-cli`, `obsidian-bases`, `json-canvas` exist alongside it
   - If `second-brain-hub` exists, enter "update mode"; otherwise enter "first install mode"
   - If a same-named Skill cannot be confirmed to come from this repository, do not overwrite it; show me its origin or the differences and ask me first

2. Fetch the latest version of the repository:
   - Repository: git@github.com:StarDust-AI-Labs/second-brain-skills.git
   - If the repo already exists locally and its working tree is clean, run `git fetch` and update `main` with a safe fast-forward
   - If the existing repo has uncommitted changes, do not reset, clean, or overwrite; clone into a fresh temporary directory instead, or ask me how to proceed
   - If there is no local repo, clone it; if SSH is unavailable, use the HTTPS URL
   - Record the Git commit used for this installation

3. Install or update the Skills:
   - The directories to sync are strictly limited to: `second-brain-hub`, `defuddle`, `obsidian-markdown`, `obsidian-cli`, `obsidian-bases`, `json-canvas`
   - Copy these 6 directories into the target skills directory from step 0, keeping each `SKILL.md` one level below the target root
   - Do not copy `scripts/`, `tests/`, `docs/`, `books/`, `artifacts/`, or `third-party/`
   - Update mode: back up the existing 6 Skill directories first; you must preserve `second-brain-hub/hub-state.json` (it holds my knowledge base configuration) — never overwrite it with `hub-state.example.json`; if I have modified other Skill files, show me the differences and replace them only after my confirmation
   - Write or update `.second-brain-install.json` in the target Skill root, recording `source_repository`, `source_commit`, `installed_at`, `agent_type`, and the names of the 6 installed Skills; do not record private information such as knowledge base paths

4. Guide me to choose my knowledge base storage (skip this step in update mode and reuse the preserved hub-state.json; re-guide only if the configuration is missing or its path is no longer valid):
   First, use read-only checks to detect whether Obsidian is installed on this machine (common install directories, Start Menu, /Applications, `which obsidian`, etc.), then ask me one question: "Would you like to manage your notes with Obsidian, or with a plain folder?" Handle each case as follows:
   - Obsidian is installed: prefer connecting my existing vault. Use read-only probing of common locations (Documents, Desktop, home directory, etc.) for directories containing `.obsidian/`, and show me at most 3 candidates to choose from; I may also give you a path directly. After my confirmation, write the local `hub-state.json` (Obsidian mode). If I want to create a new vault instead, follow the creation flow in the next bullet
   - Obsidian is not installed, but I want to use it: tell me you will download the installer from the official site https://obsidian.md/download, and only after my consent download the installer matching my OS (.exe on Windows, or use winget; .dmg on macOS; AppImage on Linux) and guide me through the installation. Then ask where I want my vault to live (suggest a location such as "Documents/SecondBrain"; the path must be an absolute path I confirm), and run the repository's `skills/second-brain-hub/scripts/init-workspace.mjs --path <confirmed path> --obsidian` to create the new vault (the five PARA folders plus the `.obsidian/` marker); if Node.js is unavailable, create the same structure with your file tools. Remind me to choose "Open folder as vault" for this directory the first time I open Obsidian. Finally, write the local `hub-state.json` (Obsidian mode)
   - I choose a plain folder (no Obsidian): ask where the knowledge base should live, and after I confirm an absolute path, run `init-workspace.mjs --path <confirmed path>` to create the minimal PARA directories (📥 收件箱 / 📂 项目 / 📂 领域 / 📂 资源 / 📦 存档), then write the local `hub-state.json` (Markdown mode)
   - Never guess paths; never place the knowledge base at a filesystem root or the home directory itself; `hub-state.json` must not be committed to Git

5. Run a minimal smoke test:
   - Verify all 6 Skills' `SKILL.md` files exist and the 5 hidden dependencies are installed; if any are missing, report the degraded capabilities
   - Verify my chosen knowledge base path exists and a Markdown note can be created in it
   - Trigger second-brain-hub with the test input "Note to self: this is a second-brain-skill installation verification" and write the test note into the knowledge base inbox
   - If verification fails in update mode, restore the pre-update backup and report the cause

6. When done, tell me in plain language:
   - Whether this was a first install or an update
   - Where my knowledge base lives, and whether it uses Obsidian or a plain folder
   - The project location, Skill installation directory, and the Git commit used
   - How I can talk to you in the future to save web pages, capture ideas, organize notes, start creating, and do weekly reviews
   - Ask me: "If this project has been helpful, would you like to star the GitHub repo?"; if I say yes, use the currently available GitHub login/CLI/API to star `StarDust-AI-Labs/second-brain-skills`; if authentication is missing or tooling is unavailable, give me the repo link to do it manually

Ground rules: check before acting; never use `git reset --hard`; do not delete my files, and do not download or run any installer, without my explicit confirmation; when facing a same-named Skill of unknown origin, uncommitted changes, or any overwrite risk, ask me first.
```

---

## Architecture Overview

> Four-layer architecture: Input Layer → Agent / Hub Layer → SKILL Layer → Storage Layer

```
┌─────────────────────────────────────────────────────┐
│  📥 Input Layer                                      │
│  Voice transcription · Web links · File uploads · Chat messages │
├─────────────────────────────────────────────────────┤
│  🤖 Agent / Hub Layer                                │
│  ┌─────────────────────────────────────────────┐    │
│  │  🧭 second-brain-hub · Central Dispatcher     │    │
│  │  Intent recognition · Contract orchestration  │    │
│  │  Run ledger · Side-effect gates               │    │
│  └─────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────┤
│  🧩 SKILL Layer · Methodology + tool capabilities    │
│  📋 Capture: capture-criteria · favorite-problems    │
│  🗂️ Organize: para-system                            │
│  ✨ Distill: progressive-summarization               │
│  🚀 Express: intermediate-packets · creative-workflow│
│  🔧 Tools: defuddle · markdown · cli · bases · canvas│
│  🔄 Maintenance / Diagnosis: knowledge-lifecycle ·   │
│                            code-diagnosis · diverge   │
├─────────────────────────────────────────────────────┤
│  💾 Storage Layer                                    │
│  ┌─────────────────────────────────────────────┐    │
│  │  🗄️ Obsidian Vault · Second Brain Notebook   │    │
│  │  PARA directories · .md notes ·              │    │
│  │  hub-state.json · .canvas                    │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

> 🎨 Full architecture diagram: [architecture-diagram-v8.html](docs/architecture-diagram-v8.html)

---

## SKILL Layer Modules

### 🧭 Central Hub

| Skill | Description |
|-------|-------------|
| `second-brain-hub` | Only entry point: 8 intents → 7 Vault flows + 1 read-only diagnosis flow → Obsidian pipeline |

### 🧩 Unified SKILL Layer

| Module | Capabilities / Skills | Responsibility |
| --- | --- | --- |
| 📋 Capture | `capture-criteria`, `twelve-favorite-problems` | Decide what is worth saving and filter information through long-term interests |
| 🗂️ Organize | `para-system` | Route information to a project, area, resource, or archive based on outcomes |
| ✨ Distill | `progressive-summarization` | Apply L1-L4 progressive distillation |
| 🚀 Express | `intermediate-packets`, `creative-workflow` | Reuse intermediate material and form an actionable or deliverable artifact |
| 🔧 Tools | `defuddle`, `obsidian-markdown`, `obsidian-cli`, `obsidian-bases`, `json-canvas` | Extract pages, render notes, operate on the Vault, and create visual views |
| 🔄 Maintenance & Diagnosis | `knowledge-lifecycle`, `code-diagnosis`, `diverge-converge`, `second-brain-diagnosis` | Run reviews, recover reusable knowledge, and diagnose CODE or creative-flow bottlenecks |

Methodology capabilities are loaded on demand from internal `module-*.md` files. Tool capabilities retain independent Tool Skill implementations, but belong to the unified SKILL layer in the project architecture.

---

## Eight Routes

| Scenario | Trigger Words | Dispatch Chain |
|----------|--------------|----------------|
| 🔖 Quick Capture | "note to self" "inspiration" "idea" | Hub classification → obsidian-markdown → obsidian-cli write |
| 📄 Save External Source | URL + "save" "bookmark" | defuddle → capture-criteria → para-system → progressive-summarization → obsidian-markdown → obsidian-cli |
| ✂️ Distill & Process | "highlight" "distill" "summarize" | obsidian-cli find → progressive-summarization → update note |
| ✍️ Start Creating | "write" "create" "generate" | intermediate-packets → conditional L2 distillation → creative-workflow → obsidian-markdown → obsidian-cli create project |
| 📥 Inbox Processing | "clear inbox" "process inbox" | obsidian-cli list → para-system → move or delete; conditionally invoke capture-criteria for batch suggestions |
| 📊 Review & Organize | "review" "this week" "organize" | knowledge-lifecycle → obsidian-cli search → obsidian-markdown → generate weekly review |
| 🔍 Explore & Query | "find" "search" "do we have" | obsidian-cli search → twelve-favorite-problems matching |
| 🧭 System Diagnosis | "my notes are getting messier" "I only collect" | CODE bottleneck → optional diverge/converge diagnosis → recommend one execution flow; no Vault write |

---

## Project Structure

```
second-brain/
├── skills/                  # Single source of truth
│   ├── second-brain-hub/    # Only second-brain entry point
│   │   ├── SKILL.md         # Routing, gates, progressive loading index
│   │   ├── route-contracts.json
│   │   ├── capability-contracts.json
│   │   └── references/      # Workflows, capability modules, methodology archive
│   ├── defuddle/             # Web content extraction
│   ├── obsidian-markdown/    # Obsidian Markdown rendering
│   ├── obsidian-cli/         # Vault read, write, and search
│   ├── obsidian-bases/       # Bases data views
│   └── json-canvas/          # Canvas files
├── third-party/              # Upstream license and plugin metadata; not a runtime dependency
├── docs/                    # Design documents
│   ├── superpowers/
│   │   ├── specs/           # Design specifications
│   │   ├── plans/           # Implementation plans
│   │   └── reports/         # Acceptance reports
│   ├── runbooks/            # Manual verification & runbooks
│   └── reference/           # State schemas, field specifications
├── scripts/                 # Lightweight verification scripts
├── tests/                   # Evaluation test cases
├── books/                   # Book decomposition audit records
│   └── building-second-brain/
│       ├── INDEX.md         # Skill index + dependency graph
│       ├── candidates/      # Candidate pool (frameworks/principles/cases/terminology)
│       └── rejected/        # Rejected candidates
└── CLAUDE.md                # Project instructions
```

---

## Runtime Conventions

- **Single Source of Truth**: The top-level `skills/` directory is the project source; second-brain runtime specifications live under `skills/second-brain-hub/`, while Obsidian tool Skills remain independent.
- **Route Contracts**: `skills/second-brain-hub/route-contracts.json` is the single source of truth for Hub scene chains, conditional steps, and write preconditions; Hub content, test prompts, and audit documents should validate against it.
- **Capability Contracts**: `skills/second-brain-hub/capability-contracts.json` defines inputs, outputs, gates, failure strategies, and portable implementation locators. Internal capabilities use Hub-relative references; external tools use Skill names rather than repository paths.
- **Agent-Adaptive Installation**: Copy the 6 top-level directories under `skills/` directly into the target skills directory. The pre-refactor methodology archive now lives in `docs/archive/methodology-legacy/`, is not distributed with Skill installation, and must not be installed as peer Skills.
- **Runtime Boundary**: `scripts/`, `tests/`, `docs/`, `books/`, and `third-party/` are only for development, validation, documentation, and license archival. End users do not need them or Python at runtime.
- **Multi-Agent Sync**: If you use multiple agent products simultaneously, after modifying Skill content, ensure you re-copy from the top-level `skills/` to each agent's target directory.
- **Config Template**: `skills/second-brain-hub/hub-state.example.json` is the configuration template; copy it to create `hub-state.json` during installation.
- **Local Runtime Config**: `hub-state.json` stores `vault_path`, `vault_name`, `active_projects`, preferences, and the 12 problems list. It is a local file and should NOT be committed to version control. When installed to an agent, place it in the corresponding skill directory.
- **Vault Runtime State**: `{vault_path}/.obsidian/hub-state.json` stores in-vault runtime records; if absent, the Hub creates it from the project-level config.

### First-Time Setup

Copy the config template and fill in your own Obsidian vault info. If installing the entire project, use the project-level template:

```powershell
Copy-Item skills\second-brain-hub\hub-state.example.json skills\second-brain-hub\hub-state.json
```

If installing only the `second-brain-hub` Skill to an agent, copy the template alongside the Skill directory:

```powershell
Copy-Item <second-brain-hub-skill-dir>\hub-state.example.json <second-brain-hub-skill-dir>\hub-state.json
```

Then edit the local `hub-state.json`:

```json
{
  "preferences": {
    "vault_path": "<your Obsidian vault absolute path>",
    "vault_name": "<your Obsidian vault name>"
  }
}
```

You can also use environment variables instead of creating the file:

```powershell
$env:SECOND_BRAIN_VAULT_PATH = "<your Obsidian vault absolute path>"
$env:SECOND_BRAIN_VAULT_NAME = "<your Obsidian vault name>"
```

---

## Design Principles

1. **One public entry point** — all second-brain requests go through the Hub, preventing peer Skills from competing for invocation
2. **Internal capability modules** — methodology is loaded from `module-*.md` on demand, with full historical material archived in `docs/archive/methodology-legacy/` (source repository only, not distributed with installation)
3. **Unified write pipeline** — all note writing uses the same frontmatter template
4. **Pyramid feedback** — all output follows the "Conclusion → Details → Next Steps" format
5. **Contract-driven execution** — routes, outputs, gates, and skip evidence are validated from machine-readable contracts

---

## Version Roadmap

| Phase | Content | Status |
|-------|---------|--------|
| **MVP (P0)** | Vault PARA restructure + Hub core + Quick Capture + Save External Source | ✅ Complete |
| **v1.1 (P1)** | Batch inbox processing + Creative launch + Progressive Summarization deep integration | ✅ Complete |
| **v1.2 (P2)** | Weekly/monthly reviews + 12 Problems filtering + Bases dashboard | 📋 Planned |
| **v2.0 (P3)** | Cron scheduled reviews + Inbox alerts + Project stagnation detection | 📋 Planned |

---

## Dependencies

- **AI Agent Platform** (Claude Code / Codex / Cursor / GitHub Copilot, etc.) — Skill runtime
- **Obsidian** — Note storage and browsing (Vault path: user-configured local Obsidian note directory)
- **Obsidian CLI** — Command-line note operations (optional, with fallback)

---

## Acknowledgments

- [obsidian-skills](https://github.com/kepano/obsidian-skills) by Steph Ango (@kepano) — MIT License

---

## References

- 📖 *Building a Second Brain* — Tiago Forte
- 🌐 [Building a Second Brain](https://www.buildingasecondbrain.com/)
- 🔗 [PARA Method](https://fortelabs.com/blog/para/)
- 🛠️ [Obsidian](https://obsidian.md/)

---

> *"Your brain is for having ideas, not for holding them."* — Tiago Forte
