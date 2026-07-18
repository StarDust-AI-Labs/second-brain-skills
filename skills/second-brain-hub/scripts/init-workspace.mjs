import fs from "node:fs";
import path from "node:path";

const folders = ["📥 收件箱", "📂 项目", "📂 领域", "📂 资源", "📦 存档"];
const args = process.argv.slice(2);
const value = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
};
const targetArg = value("--path");
const dryRun = args.includes("--dry-run");

if (!targetArg || !path.isAbsolute(targetArg)) {
  throw new Error("--path must be an absolute path");
}

const target = path.resolve(targetArg);
const parsed = path.parse(target);
const home = path.resolve(process.env.USERPROFILE || process.env.HOME || parsed.root);
if (target === parsed.root || target === home) {
  throw new Error("Refusing to initialize a filesystem root or the user home directory");
}

const operations = folders.map((folder) => {
  const folderPath = path.join(target, folder);
  return {folder, path: folderPath, status: fs.existsSync(folderPath) ? "existing" : "create"};
});

if (!dryRun) {
  fs.mkdirSync(target, {recursive: true});
  for (const operation of operations) {
    fs.mkdirSync(operation.path, {recursive: true});
  }
}

process.stdout.write(JSON.stringify({target, dry_run: dryRun, operations}, null, 2));
