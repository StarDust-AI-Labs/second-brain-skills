# Hub Runtime Protocol

## Required state machine

`INIT -> CONFIG_CHECKED -> INTENT_CLASSIFIED -> CONTRACT_LOADED -> MAP_CARD_EMITTED -> EXECUTING -> PREFLIGHTED -> WRITE_COMMITTED -> COMPLETION_CARD_EMITTED`

Read and write operations for a second-brain scene must use `scripts/hub-runtime.mjs`. A missing run id, invalid contract step, failed gate, missing token, unavailable dependency, or blocked configuration is fail-closed: stop and report the reason.

## Commands

1. `start --state-dir <dir>` validates `hub-state.json` and issues a run id.
2. `route --run-id <id> --scene <id> --user-text <text>` loads the selected contract.
3. `step --run-id <id> --step <id> --evidence <text>` records evidence. Conditional steps may only be skipped with `--skip --reason <evidence>`.
4. `preflight --run-id <id> --target-path <absolute path> --template-file <file>` validates configuration, real paths, template structure, and confirmation requirements, then issues a one-use write token.
5. `write --run-id <id> --token <token> --operation create|edit|move|delete` performs the filesystem operation inside Runtime and records before/after hashes and a signed receipt.
6. `finish --run-id <id>` validates every required step, output, preflight, and Runtime receipt before emitting the completion card.

Direct filesystem writes and caller-supplied receipts do not satisfy the write contract.

## Storage safety

Storage mode must be `obsidian` or `markdown`; its named root must be an existing directory. Targets must be absolute, strictly below that root, and must not traverse a symlink or Windows junction. Run ids match `^run-\\d{14}-[0-9a-f]{6}$`. Ledger writes use a temporary file followed by an atomic rename.

## Write confirmation

Create and edit require validated Markdown with complete frontmatter and a title plus core callout. Move and delete require explicit per-item confirmation bound to source, destination, operation, and preview. Completion is denied unless Runtime itself performed the operation and verified the resulting state.
