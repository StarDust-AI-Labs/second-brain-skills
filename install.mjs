// Supports both the repository's skills/ layout and the flat offline package layout.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const candidates = [
  path.join(root, "skills", "second-brain-hub", "scripts", "install.mjs"),
  path.join(root, "second-brain-hub", "scripts", "install.mjs"),
];
const implementation = candidates.find((candidate) => fs.existsSync(candidate));

if (!implementation) {
  throw new Error("Could not find second-brain-hub/scripts/install.mjs beside this installer");
}

await import(pathToFileURL(implementation).href);
