import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distRoot = path.join(repoRoot, "dist");

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function collectFiles(directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }

  const entries = fs.readdirSync(directory, { withFileTypes: true });
  return entries.flatMap((entry) => {
    if (entry.isSymbolicLink()) {
      return [];
    }

    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return collectFiles(entryPath);
    }

    return entryPath.endsWith(".js") ? [entryPath] : [];
  });
}

function toPosixRelativePath(basePath, filePath) {
  return path.relative(basePath, filePath).split(path.sep).join("/");
}

if (!fs.existsSync(distRoot)) {
  throw new Error("dist directory does not exist. Run `npm run build` first.");
}

const filesToHash = [
  path.join(distRoot, "src", "scaffolder.js"),
  path.join(distRoot, "src", "prompts.js"),
  ...collectFiles(path.join(distRoot, "src", "scaffolders")),
].filter((filePath) => fs.existsSync(filePath));

if (filesToHash.length === 0) {
  throw new Error("No template files were found to hash.");
}

const manifest = {
  algorithm: "sha256",
  files: Object.fromEntries(
    filesToHash
      .map((filePath) => [toPosixRelativePath(distRoot, filePath), sha256(filePath)])
      .sort(([left], [right]) => left.localeCompare(right))
  ),
};

const manifestJson = `${JSON.stringify(manifest, null, 2)}\n`;
const manifestPath = path.join(distRoot, "template-manifest.json");
const manifestHashPath = path.join(distRoot, "template-manifest.sha256");

fs.writeFileSync(manifestPath, manifestJson);
fs.writeFileSync(
  manifestHashPath,
  `${crypto.createHash("sha256").update(manifestJson).digest("hex")}  template-manifest.json\n`
);

console.log(`Wrote template integrity manifest for ${filesToHash.length} files.`);
