# 🧠 Second Brain · Skill Ecosystem

> An AI Agent knowledge management skill system built on Tiago Forte's *Building a Second Brain* — upgrading "knowledge recording" into "knowledge creation", powered by Obsidian skills to fully manage your digital notes.

---

## Overview

This project engineers the methodologies from *Building a Second Brain* — the CODE framework, PARA organizing system, Progressive Summarization, Twelve Favorite Problems, and the **Hemingway Bridge** — into a Skill system that AI Agents can invoke directly. `second-brain-hub` serves as the single entry point, housing 9 methodology capability modules and 5 Obsidian tool Skills. Users simply say "capture this idea", "save this webpage", "distill to L2", or "diagnose why I'm collecting but never creating" — the Agent handles intent routing, contract orchestration, gate checks, and knowledge writing automatically. Compatible with Claude Code, Codex, Cursor, Coze, WorkBuddy, and other major Agent platforms.

**Core philosophy**: The endpoint of knowledge management is not collecting — it's creating.

![Second Brain Concept Poster](<docs/第二大脑海报 (2).png>)

---

## Copy-Paste Prompt for Other Users

Send the following prompt directly to your agent. It handles only safe installation or update; after installation, the installed `second-brain-hub/SETUP.md` is the single initialization SOP, so the public prompt and runtime onboarding cannot drift apart:

```text
Please install or update the "Second Brain" Skills and then use the project-provided SOP to set up my knowledge base. Speak in plain language, ask only one question at a time, and explain any command or file change before asking for my consent. Do not ask me to type commands or edit configuration files manually.

Repository: git@github.com:StarDust-AI-Labs/second-brain-skills.git (use HTTPS if SSH is unavailable).

Please do the following:

1. Determine the skills directory actually used by this Agent from current configuration and existing directories, and tell me the evidence. Ask me only if it cannot be determined.
2. Safely obtain the latest `main`. If an existing repository has uncommitted changes, do not overwrite or clean it; use a temporary directory or ask me first.
3. Install or update these six directories from the repository's top-level `skills/`: `second-brain-hub`, `defuddle`, `obsidian-markdown`, `obsidian-cli`, `obsidian-bases`, and `json-canvas`. Back up existing versions first and preserve `second-brain-hub/hub-state.json` and my custom changes.
4. After installation, completely read `second-brain-hub/SETUP.md` from the installed directory. Follow it exactly for first-time initialization, configuration repair, or reuse of an existing knowledge base. Do not duplicate or rewrite its initialization steps, and do not create a synthetic test note.
5. Verify that all six `SKILL.md` files exist. Then tell me whether this was an install or update, the Skill directory, the Git commit used, and the knowledge-base setup result.

Safety rules: inspect before changing anything; never use `git reset --hard`; do not delete or overwrite files of unknown origin or files with uncommitted changes; never commit `hub-state.json`.
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
│  │  🗄️ Obsidian Vault or Markdown Workspace     │    │
│  │  PARA directories · .md notes ·              │    │
│  │  hub-state.json · .canvas (optional)         │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

> 🎨 Full architecture diagram: [architecture-diagram-v8.html](docs/architecture-diagram-v8.html)

---

## SKILL Layer Modules

### 🧭 Central Hub

| Skill | Description |
|-------|-------------|
| `second-brain-hub` | Only entry point: 8 intents → 7 storage-backed flows + 1 read-only diagnosis flow |

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
- **Config Template**: `skills/second-brain-hub/hub-state.example.json` is consumed only by `second-brain-hub/SETUP.md` to create the local `hub-state.json`; ordinary users do not copy or edit it manually.
- **Local Runtime Config**: `hub-state.json` stores `storage_mode`, the selected Vault or Markdown workspace path/name, onboarding state, active projects, preferences, and the 12 problems list. It is local-only and must NOT be committed to version control.
- **Runtime State**: Obsidian mode may store runtime records in `{vault_path}/.obsidian/hub-state.json`; Markdown mode keeps runtime state beside the Hub's local config and does not require `.obsidian/`.

### First-Time Setup

If no valid storage configuration exists, the runtime onboarding adapter completely executes the installed `second-brain-hub/SETUP.md`. This is the same SOP used immediately after prompt-based installation. It can connect an existing Obsidian Vault, connect an existing Markdown folder, or create a minimal PARA workspace, then resume the original request without asking the user to repeat it.

Manually copying the Skill does not create a separate setup path. On first use, the Hub detects the missing configuration and invokes the same `SETUP.md`. To initialize before the first note, ask the Agent: "Completely read the installed `second-brain-hub/SETUP.md` and use that SOP to initialize my knowledge base."

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
