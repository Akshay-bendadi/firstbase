import fs from "fs";
import path from "path";
import type { Framework, Language } from "../prompts.js";

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
!.env.example
.npmrc
*.pem
*.key
*.p8
*.p12
*.crt
*.cer
id_rsa
id_ed25519
serviceAccount.json
service-account.json
*.serviceAccount.json
*.service-account.json
secrets.json
secrets.*.json
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

function ciWorkflowContent(framework: Framework, includeTests: boolean): string {
  void framework;
  void includeTests;
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
          node-version: 20.19.0
          cache: npm

      - name: Dependency review
        if: github.event_name == 'pull_request'
        uses: actions/dependency-review-action@v4

      - name: Install dependencies
        run: npm ci

      - name: Audit dependencies
        run: npm audit --audit-level=high

      - name: Quality gate
        run: npm run check
`;
}

function nodeVersionContent(): string {
  return "20.19.0\n";
}

function socketWorkflowContent(): string {
  return `name: Socket Security

on:
  push:
    branches: ["main", "master"]
  pull_request:

permissions:
  contents: read

jobs:
  socket:
    runs-on: ubuntu-latest
    env:
      SOCKET_SECURITY_API_KEY: \${{ secrets.SOCKET_SECURITY_API_KEY }}
      SOCKET_ORG: \${{ vars.SOCKET_ORG }}
    steps:
      - name: Check Socket configuration
        id: socket-config
        shell: bash
        run: |
          if [ -z "$SOCKET_SECURITY_API_KEY" ]; then
            echo "::notice title=Socket skipped::SOCKET_SECURITY_API_KEY is not available to this workflow run."
            echo "enabled=false" >> "$GITHUB_OUTPUT"
            exit 0
          fi

          if [ -z "$SOCKET_ORG" ]; then
            echo "::notice title=Socket skipped::SOCKET_ORG repository variable is not configured."
            echo "enabled=false" >> "$GITHUB_OUTPUT"
            exit 0
          fi

          echo "::add-mask::$SOCKET_SECURITY_API_KEY"
          echo "enabled=true" >> "$GITHUB_OUTPUT"

      - name: Checkout
        if: steps.socket-config.outputs.enabled == 'true'
        uses: actions/checkout@v4

      - name: Setup Node
        if: steps.socket-config.outputs.enabled == 'true'
        uses: actions/setup-node@v4
        with:
          node-version: 20.19.0
          cache: npm

      - name: Install Socket CLI
        if: steps.socket-config.outputs.enabled == 'true'
        run: npm install --global socket@1.1.85

      - name: Run Socket policy scan
        if: steps.socket-config.outputs.enabled == 'true'
        shell: bash
        run: |
          repo="\${GITHUB_REPOSITORY#*/}"
          branch="\${GITHUB_HEAD_REF:-\${GITHUB_REF_NAME}}"
          socket scan create --org "$SOCKET_ORG" --repo "$repo" --branch "$branch" --report --no-interactive .
`;
}

function eslintConfigContent(language: Language): string {
  const typescriptImport = language === "ts" ? `import nextTypescript from "eslint-config-next/typescript";\n` : "";
  const typescriptSpread = language === "ts" ? `  ...nextTypescript,\n` : "";

  return `import nextVitals from "eslint-config-next/core-web-vitals";
${typescriptImport}
const eslintConfig = [
  ...nextVitals,
${typescriptSpread}  {
    ignores: [
      ".next/**",
      "build/**",
      "coverage/**",
      "dist/**",
      "node_modules/**",
      "out/**",
    ],
  },
];

export default eslintConfig;
`;
}

function nextSecurityConfigContent(language: Language): string {
  const typeImport = language === "ts" ? `import type { NextConfig } from "next";\n\n` : "";
  const typeAnnotation = language === "ts" ? ": NextConfig" : "";

  return `${typeImport}const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https:",
      "upgrade-insecure-requests",
    ].join("; "),
  },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig${typeAnnotation} = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
`;
}

function writeNextSecurityConfig(projectPath: string, language: Language): void {
  const configFile = language === "ts" ? "next.config.ts" : "next.config.mjs";
  const staleFiles = ["next.config.js", "next.config.mjs", "next.config.ts"].filter(
    (fileName) => fileName !== configFile
  );

  for (const fileName of staleFiles) {
    const filePath = path.join(projectPath, fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  writeIfChanged(path.join(projectPath, configFile), nextSecurityConfigContent(language));
}

export function scaffoldQualityFiles(
  projectPath: string,
  framework: Framework,
  includeTests = false,
  language: Language = "ts"
): void {
  writeIfChanged(path.join(projectPath, ".nvmrc"), nodeVersionContent());
  writeIfChanged(path.join(projectPath, ".node-version"), nodeVersionContent());
  writeIfChanged(path.join(projectPath, ".gitignore"), gitignoreContent());
  writeIfChanged(path.join(projectPath, ".prettierrc.cjs"), prettierConfigContent());
  writeIfChanged(path.join(projectPath, ".prettierignore"), prettierIgnoreContent());
  writeIfChanged(path.join(projectPath, ".github", "workflows", "ci.yml"), ciWorkflowContent(framework, includeTests));
  writeIfChanged(path.join(projectPath, ".github", "workflows", "socket.yml"), socketWorkflowContent());
  if (framework === "next") {
    writeIfChanged(path.join(projectPath, "eslint.config.mjs"), eslintConfigContent(language));
    writeNextSecurityConfig(projectPath, language);
  }
}
