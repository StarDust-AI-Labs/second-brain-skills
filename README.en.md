# 🧠 Second Brain · Skill Ecosystem

> An AI Agent knowledge management skill system built on Tiago Forte's *Building a Second Brain* — turning "information consumption" into "knowledge creation", powered by Obsidian skills to fully manage your digital notes.

---

## Overview

This project is a complete **Personal Knowledge Management (PKM) Skill system**, built on Skill technology and compatible with multiple AI Agent products (Claude Code / Codex / Cursor / Coze / WorkBuddy, etc.).

It distills the CODE methodology from *Building a Second Brain* into 9 internal capability modules inside `second-brain-hub`, combined with 5 independent Obsidian tool Skills. The Hub is the only public entry point for second-brain workflows.

**Core philosophy**: The endpoint of information management is not "knowing" — it's "creating".

![Second Brain Concept Poster](docs/第二大脑概念海报.png)

---

## Copy-Paste Prompt for Other Users

Send the following prompt directly to your agent — it will auto-detect the platform, download this project, install Skills to the correct directory, and guide you through connecting to your local Obsidian vault:

```text
Please help me install and configure the second-brain-skill project to manage my local Obsidian vault.

Follow these steps:

0. ⚠️ First, detect the current agent product type and determine the Skill installation target directory:
   - Claude Code → copy from skills/ to .claude/skills/
   - Codex → copy from skills/ to .agents/skills/
   - Cursor → copy from skills/ to .cursor/skills/
   - Coze (扣子) → copy from skills/ to .coze/skills/
   - WorkBuddy (问壁) → copy from skills/ to .workbuddy/skills/
   - Codeium / other domestic agents → look up that agent's skills convention directory; if not found, ask the user
   Report the detection result and target directory to the user before continuing.
   The top-level skills/ directory is the single source of truth for this project. All installations copy from this directory.

1. Download the project:
   - Prefer cloning the repo: git@github.com:StarDust-AI-Labs/second-brain-skills.git
   - If SSH is not available in the current environment, prompt me for the HTTPS URL or Git credentials

2. Install Skills to the target directory determined in step 0:
   - Copy the 6 directories directly under the project's `skills/` into the target skills directory, keeping each `SKILL.md` one level below the target root
   - Do not copy `scripts/`, `tests/`, `docs/`, `books/`, or `third-party/`; they are not runtime dependencies
   - Do not overwrite my existing Skills with the same name; before overwriting, list the differences and ask me first

3. Install the core Skills from this project:
   - second-brain-hub (the only second-brain entry point; methodology modules are bundled)
   - defuddle
   - obsidian-markdown
   - obsidian-cli
   - obsidian-bases
   - json-canvas

4. Check whether Obsidian is installed on this machine:
   - If already installed, continue to the next step
   - If not installed, give me the official download link https://obsidian.md/download and guide me to download and install Obsidian
   - Wait for me to confirm Obsidian is installed and can open normally before proceeding to vault configuration

5. Guide me through connecting to my local Obsidian vault:
   - Ask for the absolute path to my Obsidian vault
   - Ask for my vault name
   - Copy skills/second-brain-hub/hub-state.example.json to create a local hub-state.json
   - Write preferences.vault_path and preferences.vault_name
   - Confirm that hub-state.json is not committed to Git

6. Perform a minimal smoke test:
   - Verify the vault path exists
   - Verify that Markdown notes can be created or updated
   - Use the test input "Note to self: this is a second-brain-skill installation verification" to trigger second-brain-hub
   - Write the test note to an appropriate location in the Obsidian vault

7. After configuration, tell me:
   - Current agent type
   - Project installation location
   - Skill installation directory
   - Currently bound vault path
   - How I can talk to you in the future to save web pages, record inspirations, organize notes, and start creating
   - Ask me: "If this project has been helpful to you, would you like to star the GitHub repo?"
   - If I say yes, use the currently available GitHub login/CLI/API to star the repo `StarDust-AI-Labs/second-brain-skills`; if authentication is missing or tools are unavailable, give me the repo link to do it manually

When executing, first check the current system, shell, agent type, and existing directory structure before performing file operations. When unsure about the installation directory or facing overwrite risks, ask me first.
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
- **Agent-Adaptive Installation**: Copy the 6 top-level directories under `skills/` directly into the target skills directory. Do not install the methodology archive under `references/legacy/` as peer Skills.
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
2. **Internal capability modules** — methodology is loaded from `module-*.md` on demand, with full historical material retained under `references/legacy/`
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
