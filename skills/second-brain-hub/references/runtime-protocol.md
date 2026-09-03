# Hub Runtime Protocol

## Required state machine

`INIT -> CONFIG_CHECKED -> INTENT_CLASSIFIED -> CONTRACT_LOADED -> MAP_CARD_EMITTED -> EXECUTING -> PREFLIGHTED -> WRITE_COMMITTED -> COMPLETION_CARD_EMITTED`

Each `preflight` opens a pending write cycle: `pending`, `awaiting_confirmation` (dangerous, 2nd phase pending), `committed`, `rejected` (audit only). Only a matching `write` settles a cycle; `WRITE_COMMITTED -> PREFLIGHTED` repeats for multiple files. `finish` is denied while any cycle is `pending`/`awaiting_confirmation`, or a `committed` cycle lacks a snapshot-matching receipt. Missing run id, invalid step, failed gate, missing token, snapshot mismatch or blocked config is fail-closed.

## Onboarding transport

`setup_trigger` is transient (run context only, never written to `hub-state.json`); idle `setup_trigger=null`.
- `post-install-prompt`: after the README install prompt call `SETUP.md` directly; no `pending_request`.
- `runtime-missing-config`: `workflow-onboarding.md` writes this, saves `pending_request`, then hands the ledger to `SETUP.md`.
- `explicit-reset-or-repair`: Hub calls `SETUP.md` directly, bypassing the onboarding adapter.
Clear `setup_trigger` after setup finishes/fails; clear `pending_request` only after the original request completes or is explicitly blocked.

## Commands

1. `start --state-dir <dir>` validates `hub-state.json`, issues run id; legacy flat state migrates to `preferences`; missing root → `config_ok=false` blocks Vault scenes.
2. `route --run-id <id> --scene <id> --user-text <text>` loads the contract.
3. `step --run-id <id> --step <id> --evidence <text>` records evidence; conditional steps skip only with `--skip --reason <evidence>`.
4. `preflight --run-id <id> --operation create|edit|move|delete --target-path <abs> [--source-path <p>] [--template-file <f>]` opens a cycle. Create/edit get a one-use `write_token` immediately. Move/delete enter `awaiting_confirmation`: Runtime reads the real source, computes `source_sha256`/`size`/`snapshot_hash`, returns a canonical `preview` + `confirmation_challenge`, issues **no** token. Caller `--preview`/`--preview-file`/`--preview-hash` are rejected.
5. `confirm --run-id <id> --cycle <id> --challenge <challenge>` is the 2nd phase; issues the one-time `write_token` + `confirmation_token`, moves the cycle to `pending`. Call only after a new user message confirms the shown preview.
6. `write --run-id <id> --token <token> [--operation <op>] [--target-path <p>] [--source-path <p>] [--content|--content-file <c>] [--confirmation <token>]` performs the op; every arg is checked against the cycle snapshot. Move/delete re-read the source and fail closed if SHA-256 changed since confirmation. Runtime records before/after hashes, settles the cycle, returns a runtime-issued receipt.
7. `finish --run-id <id>` validates steps, outputs and **every** write cycle before the completion card. `gate` reports the decision without writing; `status` dumps the ledger.

Direct filesystem writes and caller-supplied receipts do not satisfy the write contract.

## Dangerous operation authorization

- Snapshot is Runtime-computed: normalized `operation`, `source_path`, `target_path`, `source_sha256`, `size`, `snapshot_hash`. Caller previews/hashes are never authorization.
- `delete` acts on exactly one path: `source_path` must resolve to `target_path`; mismatch rejected.
- `move` needs an approved `source_path`; unapproved source/target rejected.
- `confirmation_token` binds run id, cycle id, operation, normalized source/target, `source_sha256`, `snapshot_hash`, `preview_hash`; issued only by `confirm`, one use.
- Before move/delete Runtime re-reads the source; any change since confirmation is rejected → fresh preflight+confirm.
- **Trust boundary**: the token proves only that a specific snapshot was confirmed; Runtime cannot cryptographically prove a human confirmed. Agent protocol requires a new user message after the preview before calling `confirm` (see `writing-pipeline.md`).

## Storage safety

Mode `obsidian`/`markdown`, root an existing dir. Targets absolute, strictly below root, never traverse symlink/junction; re-checked before each write. Run ids `^run-\d{14}-[0-9a-f]{6}$`; ledger writes use temp file + atomic rename.
