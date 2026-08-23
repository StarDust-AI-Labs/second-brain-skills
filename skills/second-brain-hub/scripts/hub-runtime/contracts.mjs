// 契约读取层：只读取生产契约，不复制步骤顺序。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
// 模块位于 scripts/hub-runtime/ 下，Skill 根在两级之上。
export const DEFAULT_SKILL_ROOT = path.resolve(here, "..", "..");

export function loadContracts(skillRoot = DEFAULT_SKILL_ROOT) {
  const route = JSON.parse(fs.readFileSync(path.join(skillRoot, "route-contracts.json"), "utf8"));
  const capability = JSON.parse(fs.readFileSync(path.join(skillRoot, "capability-contracts.json"), "utf8"));
  return { route, capability };
}

export function getScene(route, sceneId) {
  const scene = (route.scenes || []).find((s) => s.id === sceneId);
  if (!scene) throw new Error(`unknown scene: ${sceneId}`);
  return scene;
}

export function requiredChain(scene) {
  return [...scene.required_steps];
}

export function conditionalIds(scene) {
  return (scene.conditional_steps || []).map((c) => c.id);
}

export function progressMap(scene) {
  return scene.progress_map || [];
}

export function isWriteMode(scene) {
  return ["write", "update", "move-or-delete"].includes(scene.mode);
}
