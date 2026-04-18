import fs from "fs";
import path from "path";
import type { Framework } from "../prompts.js";

function ensureDir(filePath: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeIfChanged(filePath: string, content: string): void {
  ensureDir(filePath);

  if (fs.existsSync(filePath)) {
    const existing = fs.readFileSync(filePath, "utf8");
    if (existing.trim() === content.trim()) {
      return;
    }
  }

  fs.writeFileSync(filePath, content);
  console.log(`♻️  Wrote: ${path.relative(process.cwd(), filePath)}`);
}

function prettierConfigContent(): string {
  return `module.exports = {
  semi: true,
  singleQuote: false,
  trailingComma: "all",
  printWidth: 100,
  plugins: ["@trivago/prettier-plugin-sort-imports"],
  importOrder: ["^react$", "^next", "<THIRD_PARTY_MODULES>", "^@", "^[./]"],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
};
`;
}

function prettierIgnoreContent(): string {
  return `node_modules
dist
build
.next
coverage
.env.local
`;
}

function gitignoreContent(): string {
  return `node_modules
dist
build
.next
.turbo
vite.svg
out
coverage
.env
.env.local
.env.*.local
.env.production
.env.development
.env.test
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
.eslintcache
.tsbuildinfo
.parcel-cache
.sass-cache
.cache
.idea
.vscode
.DS_Store
.vercel
.netlify
.astro
.svelte-kit
`;
}

function ciWorkflowContent(framework: Framework): string {
  const extraChecks =
    framework === "next"
      ? `      - name: Lint
        run: npm run lint

`
      : "";

  return `name: CI

on:
  push:
    branches: ["main", "master"]
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

${extraChecks}      - name: Format check
        run: npm run format:check

      - name: Build
        run: npm run build
`;
}

export function scaffoldQualityFiles(projectPath: string, framework: Framework): void {
  writeIfChanged(path.join(projectPath, ".gitignore"), gitignoreContent());
  writeIfChanged(path.join(projectPath, ".prettierrc.cjs"), prettierConfigContent());
  writeIfChanged(path.join(projectPath, ".prettierignore"), prettierIgnoreContent());
  writeIfChanged(path.join(projectPath, ".github", "workflows", "ci.yml"), ciWorkflowContent(framework));
}
