import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distRoot = path.join(repoRoot, "dist");
const manifestPath = path.join(distRoot, "template-manifest.json");
const manifestHashPath = path.join(distRoot, "template-manifest.sha256");

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

if (!fs.existsSync(manifestPath) || !fs.existsSync(manifestHashPath)) {
  throw new Error("Template integrity manifest is missing. Run `npm run build` first.");
}

const manifestJson = fs.readFileSync(manifestPath, "utf8");
const expectedManifestHash = fs.readFileSync(manifestHashPath, "utf8").split(/\s+/)[0];
const actualManifestHash = crypto.createHash("sha256").update(manifestJson).digest("hex");

if (actualManifestHash !== expectedManifestHash) {
  throw new Error("Template integrity manifest hash does not match template-manifest.sha256.");
}

const manifest = JSON.parse(manifestJson);

if (manifest.algorithm !== "sha256" || typeof manifest.files !== "object" || manifest.files === null) {
  throw new Error("Template integrity manifest has an invalid shape.");
}

for (const [relativePath, expectedHash] of Object.entries(manifest.files)) {
  if (typeof expectedHash !== "string" || !/^[a-f0-9]{64}$/.test(expectedHash)) {
    throw new Error(`Invalid SHA-256 hash for manifest file: ${relativePath}`);
  }

  const absolutePath = path.join(distRoot, relativePath);
  if (!absolutePath.startsWith(`${distRoot}${path.sep}`)) {
    throw new Error(`Invalid manifest path: ${relativePath}`);
  }

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Manifest file is missing: ${relativePath}`);
  }

  const actualHash = sha256(absolutePath);
  if (actualHash !== expectedHash) {
    throw new Error(`Template file hash mismatch: ${relativePath}`);
  }
}

console.log(`Verified template integrity manifest for ${Object.keys(manifest.files).length} files.`);
