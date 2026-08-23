import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
export const SKILL_ROOT = path.join(REPO_ROOT, "skills", "second-brain-hub");

// 每次测试创建独立临时 state-dir，并写入一份可用的 hub-state.json
export function makeStateDir({ storageMode = "markdown", workspace = "vault" } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hub-rt-"));
  const storagePath = path.join(dir, workspace);
  fs.mkdirSync(storagePath, { recursive: true });
  const state = {
    version: "1.2",
    preferences: storageMode === "obsidian"
      ? { storage_mode: "obsidian", vault_path: storagePath, vault_name: "TestVault", workspace_path: storagePath, workspace_name: "TestVault" }
      : { storage_mode: "markdown", workspace_path: storagePath, workspace_name: "TestWS", vault_path: storagePath, vault_name: "TestWS" },
  };
  fs.writeFileSync(path.join(dir, "hub-state.json"), JSON.stringify(state, null, 2), "utf8");
  return { dir, storagePath };
}
