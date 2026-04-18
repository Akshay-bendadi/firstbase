import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import chalk from 'chalk';
import type { Answers } from "./prompts.js";

// Styled console messages
const statusIcon = chalk.hex("#4ECDC4").bold("◆");
const log = {
  info: (message: string) => console.log(chalk.blue(`${statusIcon} ${message}`)),
  success: (message: string) => console.log(chalk.green(`${statusIcon} ${message}`)),
  warning: (message: string) => console.log(chalk.yellow(`${statusIcon} ${message}`)),
  error: (message: string) => console.error(chalk.red(`${statusIcon} ${message}`)),
  step: async (message: string) => {
    const frames = ["◐", "◓", "◑", "◒"];
    for (const frame of frames) {
      process.stdout.write(`\r${chalk.magenta(`${statusIcon} ${message} ${frame}`)}`);
      await new Promise((resolve) => setTimeout(resolve, 45));
    }
    process.stdout.write(`\r${chalk.magenta(`${statusIcon} ${message}`)}\n`);
  },
  highlight: (message: string) => console.log(chalk.hex('#FF6B6B')(message)),
  divider: () => console.log(chalk.gray('─'.repeat(process.stdout.columns || 50)))
};

function createFolder(folder: string): void {
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }
}

function ensureEmptyTarget(projectPath: string): void {
  if (!fs.existsSync(projectPath)) {
    return;
  }

  const entries = fs.readdirSync(projectPath).filter((entry) => entry !== ".DS_Store");
  if (entries.length > 0) {
    throw new Error(
      `Target directory already exists and is not empty: ${projectPath}. Remove it or choose a new project name before scaffolding.`
    );
  }
}

async function runCommand(
  command: string,
  args: string[],
  options: {
    stdio?: "inherit" | "ignore";
    env?: NodeJS.ProcessEnv;
    cwd?: string;
    loadingMessage?: string;
  } = {}
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: options.stdio === "ignore" ? "ignore" : "inherit",
      shell: false,
    });

    const spinnerFrames = ["◐", "◓", "◑", "◒"];
    const loadingMessage = options.loadingMessage ?? `Running ${command}`;
    let spinnerIndex = 0;
    const spinner = setInterval(() => {
      process.stdout.write(
        `\r${chalk.magenta(`${statusIcon} ${loadingMessage} ${spinnerFrames[spinnerIndex % spinnerFrames.length]}`)}`
      );
      spinnerIndex += 1;
    }, 120);
    process.stdout.write(`\r${chalk.magenta(`${statusIcon} ${loadingMessage} ${spinnerFrames[0]}`)}`);

    child.on("error", reject);
    child.on("close", (code) => {
      clearInterval(spinner);
      process.stdout.write(`\r${chalk.magenta(`${statusIcon} ${loadingMessage}`)}\n`);
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} exited with code ${code ?? "unknown"}`));
    });
  });
}

function npmInstallArgs(packages: string[], dev = false): string[] {
  return ["install", "--no-audit", "--no-fund", "--silent", ...(dev ? ["-D"] : []), ...packages];
}

function createFolders(projectPath: string, framework: Answers["framework"]): void {
  const folders = ["public"];

  if (framework === "next") {
    folders.push("components", "hooks", "lib", "services", "styles", "types", "utils");
  } else {
    folders.push(
      "src/components",
      "src/hooks",
      "src/lib",
      "src/services",
      "src/styles",
      "src/types",
      "src/utils",
      "src/pages",
      "src/routes"
    );
  }

  folders.forEach((folder) => createFolder(path.join(projectPath, folder)));
}

function parseJsonLike(content: string): Record<string, unknown> {
  const withoutBlockComments = content.replace(/\/\*[\s\S]*?\*\//g, "");
  const withoutLineComments = withoutBlockComments.replace(/(^|[^:\\])\/\/.*$/gm, "$1");
  const withoutTrailingCommas = withoutLineComments.replace(/,\s*([}\]])/g, "$1");
  return JSON.parse(withoutTrailingCommas);
}

function updateAliasConfig(projectPath: string): void {
  const configCandidates = ["tsconfig.json", "jsconfig.json"];
  const configPath = configCandidates
    .map((fileName) => path.join(projectPath, fileName))
    .find((candidate) => fs.existsSync(candidate)) ?? path.join(projectPath, "jsconfig.json");

  const existing = fs.existsSync(configPath)
    ? (() => {
        try {
          return parseJsonLike(fs.readFileSync(configPath, "utf8"));
        } catch {
          return {};
        }
      })()
    : {};
  const compilerOptions = ((existing as { compilerOptions?: Record<string, unknown> }).compilerOptions ?? {}) as Record<string, unknown>;

  compilerOptions.baseUrl = ".";
  compilerOptions.paths = {
    "@/*": ["./*", "./src/*"],
  };

  existing.compilerOptions = compilerOptions;
  fs.writeFileSync(configPath, JSON.stringify(existing, null, 2));
}

function writeFileIfChanged(filePath: string, content: string): void {
  createFolder(path.dirname(filePath));

  if (fs.existsSync(filePath)) {
    const existing = fs.readFileSync(filePath, "utf8");
    if (existing.trim() === content.trim()) {
      return;
    }
  }

  fs.writeFileSync(filePath, content);
}

function huskyHookContent(): string {
  return `#!/usr/bin/env sh
npm run check
`;
}

function makeExecutable(filePath: string): void {
  try {
    fs.chmodSync(filePath, 0o755);
  } catch {
    // Ignore platforms that do not support chmod in the same way.
  }
}

function checkScriptFor(framework: Answers["framework"]): string {
  return framework === "next"
    ? "npm run lint && npm run format:check && npm run build"
    : "npm run format:check && npm run build";
}

function advancedCheckScriptFor(framework: Answers["framework"]): string {
  return framework === "next"
    ? "npm run lint && npm run format:check && npm run test && npm run build"
    : "npm run format:check && npm run test && npm run build";
}

function formatDuration(totalMs: number): string {
  const totalSeconds = Math.max(0, Math.round(totalMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  }

  return `${minutes}m ${seconds}s`;
}

function folderSizeInMb(folderPath: string): number {
  let totalBytes = 0;

  function walk(currentPath: string): void {
    if (!fs.existsSync(currentPath)) {
      return;
    }

    const stats = fs.statSync(currentPath);
    if (stats.isDirectory()) {
      for (const entry of fs.readdirSync(currentPath)) {
        walk(path.join(currentPath, entry));
      }
      return;
    }

    totalBytes += stats.size;
  }

  walk(folderPath);
  return totalBytes / (1024 * 1024);
}

function packageDownloadSizeInMb(projectPath: string): number {
  return folderSizeInMb(path.join(projectPath, "node_modules"));
}

function frameworkLabel(answers: Answers): string {
  return answers.framework === "next" ? "Next.js" : "React + Vite";
}

function routingLabel(answers: Answers): string {
  if (answers.framework !== "next") {
    return "N/A";
  }

  return answers.routing === "app" ? "App Router" : "Pages Router";
}

function advancedFeaturesList(answers: Answers): string[] {
  const features: string[] = [];

  if (answers.reactQuery) features.push("React Query");
  if (answers.auth) features.push("Auth scaffold");
  if (answers.forms) features.push("Forms stack");
  if (answers.toasts) features.push("Toast system");
  if (answers.i18n) features.push("Language support");
  if (answers.seo) features.push("SEO metadata");
  if (answers.tests) features.push("Test baseline");

  return features;
}

function projectReadmeContent(answers: Answers): string {
  const techStack = [
    `Framework: ${frameworkLabel(answers)}`,
    `Language: ${answers.language === "ts" ? "TypeScript" : "JavaScript"}`,
    `Routing: ${routingLabel(answers)}`,
    `UI library: ${answers.uiLibrary === "shadcn" ? "shadcn/ui" : "None"}`,
    `Husky: ${answers.setupHusky ? "Enabled" : "Disabled"}`,
  ];
  const advancedFeatures = advancedFeaturesList(answers);
  const starterStructure =
    answers.framework === "react"
      ? ["src/components/", "src/lib/", "src/pages/", "src/routes/"]
      : answers.routing === "app"
        ? ["app/", "components/", "lib/", "styles/"]
        : ["pages/", "components/", "lib/", "styles/"];

  return `# ${answers.projectName}

${frameworkLabel(answers)} starter generated by [Quicky Setup](https://github.com/your-org/quicky-setup).

## Stack

${techStack.map((item) => `- ${item}`).join("\n")}

## Included

- Tailwind baseline with a designed landing page
- Dark/light theme toggle
- API client with interceptor and env files
- Production gitignore file
- First commit prepared for you
${answers.uiLibrary === "shadcn" ? "- shadcn/ui component baseline" : "- Plain HTML fallback when shadcn is not selected"}
${advancedFeatures.length ? `- Advanced modules: ${advancedFeatures.join(", ")}` : ""}

## Start

\`\`\`bash
npm run dev
\`\`\`

${answers.framework === "next" ? "## Next.js Notes\n\n- App Router and Pages Router are supported from the scaffold.\n- Use `npm run dev:turbo` if you want the turbo dev server.\n\n" : ""}
## Project Layout

${starterStructure.map((item) => `- ${item}`).join("\n")}

## Conventions

- Keep UI blocks utility-first and production oriented.
- Extend the generated API client instead of wiring fetch logic ad hoc.
- Add new advanced modules through the scaffold flow when possible.

Generated with the first commit already prepared.
`;
}

export async function scaffoldProject(answers: Answers): Promise<void> {
  const startedAt = Date.now();
  // Ensure we're using the raw project name without any chalk formatting
  const rawProjectName = answers.projectName.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
  const projectPath = path.resolve(process.cwd(), rawProjectName);

  ensureEmptyTarget(projectPath);
  // Create the output folder up front so framework bootstrappers have a stable target.
  createFolder(projectPath);

  log.divider();
  await log.step(chalk.bold.cyan('Creating your project'));
  log.divider();

  // 1. Initialize base project first
  if (answers.framework === "next") {

    // Install specific stable version of Next.js
    const nextVersion = "14.2.3";
    const args = [
      `create-next-app@${nextVersion}`,
      ".",
      "--import-alias",
      "@/*",
      "--eslint",
      "--tailwind",
      "--use-npm"
    ];

    // Add React and React DOM dependencies with compatible versions
    const dependencies = {
      "next": `^${nextVersion}`,
      "react": "^18.2.0",
      "react-dom": "^18.2.0",
      "axios": "^1.11.0",
      "lucide-react": "^0.390.0"
    };

    args.push(answers.language === "ts" ? "--typescript" : "--js");

    if (answers.routing === "app") {
      args.push("--app");
    }

    await runCommand("npx", ["--yes", ...args], {
      stdio: "ignore",
      cwd: projectPath,
      loadingMessage: "Creating Next.js app",
      env: {
        ...process.env,
        NEXT_TELEMETRY_DISABLED: "1",  // Disable telemetry
        NEXT_DISABLE_CREATE_NEXT_APP_UPDATE_NOTIFICATION: "1"  // Disable update notification
      }
    });

    const packageJsonPath = path.join(projectPath, "package.json");
    const packageJson = fs.existsSync(packageJsonPath)
      ? JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
      : {
          name: rawProjectName,
          version: "0.1.0",
          private: true,
          scripts: {},
          dependencies: {},
          devDependencies: {},
        };

    packageJson.dependencies = {
      ...packageJson.dependencies,
      ...dependencies
    };

    packageJson.devDependencies = {
      ...packageJson.devDependencies,
      "@types/node": "^20.11.0",
      "@types/react": "^18.2.0",
      "@types/react-dom": "^18.2.0",
      "autoprefixer": "^10.4.0",
      "eslint": "^8.0.0",
      "eslint-config-next": `^${nextVersion}`,
      "tailwindcss": "^3.4.0",
      "typescript": "^5.0.0"
    };

    packageJson.scripts = packageJson.scripts || {};
    packageJson.scripts["dev"] = "next dev --turbo";
    packageJson.scripts["build"] = "next build";
    packageJson.scripts["start"] = "next start";
    packageJson.scripts["lint"] = "next lint";
    packageJson.scripts["dev:turbo"] = "next dev --turbo";
    packageJson.scripts["format"] = "prettier . --write";
    packageJson.scripts["format:check"] = "prettier . --check";
    if (answers.setupHusky) {
      packageJson.scripts["check"] = checkScriptFor("next");
    }
    if (answers.advancedMode === "go_advanced") {
      if (answers.tests) {
        packageJson.scripts["test"] = "vitest";
        packageJson.scripts["test:watch"] = "vitest --watch";
        packageJson.scripts["check"] = advancedCheckScriptFor("next");
      }
    }

    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

    await runCommand("npm", npmInstallArgs(["axios", "lucide-react"]), {
      stdio: "ignore",
      cwd: projectPath,
      loadingMessage: "Installing base dependencies",
    });
  } else {
    await runCommand(
      "npx",
      [
        "--yes",
        "create-vite@5.2.0",
        ".",
        "--template",
        answers.language === "ts" ? "react-ts" : "react",
      ],
      { stdio: "ignore", cwd: projectPath, loadingMessage: "Creating React app" }
    );

    await log.step('Installing theme dependencies');
    const packageJsonPath = path.join(projectPath, "package.json");
    const packageJson = fs.existsSync(packageJsonPath)
      ? JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"))
      : {
          name: rawProjectName,
          version: "0.1.0",
          private: true,
          scripts: {},
          dependencies: {},
          devDependencies: {},
        };

    packageJson.scripts = packageJson.scripts || {};
    packageJson.scripts["format"] = "prettier . --write";
    packageJson.scripts["format:check"] = "prettier . --check";
    if (answers.setupHusky) {
      packageJson.scripts["check"] = checkScriptFor("react");
    }
    if (answers.advancedMode === "go_advanced") {
      if (answers.tests) {
        packageJson.scripts["test"] = "vitest";
        packageJson.scripts["test:watch"] = "vitest --watch";
        packageJson.scripts["check"] = advancedCheckScriptFor("react");
      }
    }

    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

    await runCommand("npm", npmInstallArgs(["tailwindcss@^3.4.17", "postcss", "autoprefixer"], true), {
      stdio: "ignore",
      cwd: projectPath,
      loadingMessage: "Installing theme dependencies",
    });
    await runCommand("npm", npmInstallArgs(["axios"]), {
      stdio: "ignore",
      cwd: projectPath,
      loadingMessage: "Installing API client",
    });
    log.success("React theme stack installed and ready");
  }

  if (answers.uiLibrary === "shadcn") {
    await log.step("Installing shadcn baseline packages");
    await runCommand("npm", npmInstallArgs([
      "lucide-react",
      "clsx",
      "tailwind-merge",
      "class-variance-authority",
    ]), {
      stdio: "ignore",
      cwd: projectPath,
      loadingMessage: "Installing shadcn baseline",
    });
    await runCommand("npm", npmInstallArgs(["tailwindcss-animate"], true), {
      stdio: "ignore",
      cwd: projectPath,
      loadingMessage: "Installing shadcn animation plugin",
    });
    log.success("shadcn baseline installed");
  }

  if (answers.setupHusky) {
    await log.step("Installing Husky");
    await runCommand("npm", npmInstallArgs(["husky"], true), {
      stdio: "ignore",
      cwd: projectPath,
      loadingMessage: "Installing Husky",
    });
    log.success("Husky installed");
  }

  await log.step("Installing formatting and CI tooling");
  await runCommand("npm", npmInstallArgs([
    "prettier",
    "@trivago/prettier-plugin-sort-imports",
  ], true), {
    stdio: "ignore",
    cwd: projectPath,
    loadingMessage: "Installing formatting and CI tooling",
  });
  log.success("Formatting and CI tooling installed");

  log.divider();
  log.highlight(chalk.bold.green('Project created successfully!'));
  log.divider();
  log.info(chalk.bold('Next steps:'));
  log.info(`1. ${chalk.cyan('cd ' + answers.projectName)}`);
  log.info(`2. ${chalk.cyan('npm run dev')} to start the development server`);
  log.info(`3. Happy coding! ${chalk.bold.red('❤️')}`);
  log.divider();

  // 2. Now create our directory structure
  log.info("Setting up project structure");
  createFolders(projectPath, answers.framework);

  updateAliasConfig(projectPath);
  log.success("Updated path aliases with proper configuration");

  // 4. Set up Theme
  await log.step("Writing theme files");
  const { scaffoldTheme } = await import("./scaffolders/themeSetup.js");
  scaffoldTheme(
    projectPath,
    answers.language,
    answers.routing,
    answers.framework,
    answers.uiLibrary,
    answers.seo,
    [
      answers.reactQuery ? "React Query provider" : "",
      answers.auth ? "Auth scaffold" : "",
      answers.forms ? "Forms stack" : "",
      answers.toasts ? "Toast system" : "",
      answers.i18n ? "Language support" : "",
      answers.tests ? "Vitest baseline" : "",
    ].filter(Boolean) as string[],
    answers.i18n
  );
  log.success("Theme added");

  await log.step("Writing API client");
  const { scaffoldApiClient } = await import("./scaffolders/apiClient.js");
  scaffoldApiClient(projectPath, answers.language, answers.framework);
  log.success("API client added");

  await log.step("Writing quality tooling");
  const { scaffoldQualityFiles } = await import("./scaffolders/qualitySetup.js");
  scaffoldQualityFiles(projectPath, answers.framework);
  log.success("Quality tooling added");

  if (answers.advancedMode === "go_advanced") {
    await log.step("Writing advanced setup");
    const { scaffoldAdvancedSetup } = await import("./scaffolders/advancedSetup.js");
    scaffoldAdvancedSetup(projectPath, answers);
    log.success("Advanced setup added");
  }

  if (answers.advancedMode === "go_advanced") {
    if (answers.reactQuery) {
      await log.step("Installing React Query");
      await runCommand("npm", npmInstallArgs(["@tanstack/react-query"]), {
        stdio: "ignore",
        cwd: projectPath,
        loadingMessage: "Installing React Query",
      });
      log.success("React Query installed");
    }

    if (answers.forms) {
      await log.step("Installing forms stack");
      await runCommand("npm", npmInstallArgs(["react-hook-form", "zod", "@hookform/resolvers"]), {
        stdio: "ignore",
        cwd: projectPath,
        loadingMessage: "Installing forms stack",
      });
      log.success("Forms stack installed");
    }

    if (answers.toasts) {
      await log.step("Installing toast system");
      await runCommand("npm", npmInstallArgs(["sonner"]), {
        stdio: "ignore",
        cwd: projectPath,
        loadingMessage: "Installing toast system",
      });
      log.success("Toast system installed");
    }

    if (answers.tests) {
      await log.step("Installing test baseline");
      await runCommand("npm", npmInstallArgs([
        "vitest",
        "jsdom",
        "@testing-library/react",
        "@testing-library/jest-dom",
      ], true), {
        stdio: "ignore",
        cwd: projectPath,
        loadingMessage: "Installing test baseline",
      });
      log.success("Test baseline installed");
    }
  }

  // Create production folder structure
  createFolders(projectPath, answers.framework);

  // Readme and git init
  fs.writeFileSync(path.join(projectPath, "README.md"), projectReadmeContent(answers));
  await runCommand("git", ["init"], {
    stdio: "ignore",
    cwd: projectPath,
    loadingMessage: "Initializing git",
  });
  if (answers.setupHusky) {
    await log.step("Setting up Husky");
    await runCommand("git", ["config", "core.hooksPath", ".husky"], {
      cwd: projectPath,
      loadingMessage: "Configuring Husky hooks",
    });
    const hookPath = path.join(projectPath, ".husky", "pre-commit");
    writeFileIfChanged(hookPath, huskyHookContent());
    makeExecutable(hookPath);
    log.success("Husky hooks added");
  }
  await runCommand("git", ["add", "."], {
    stdio: "ignore",
    cwd: projectPath,
    loadingMessage: "Staging initial commit",
  });
  await runCommand("git", ["commit", "--no-verify", "-m", "Initial commit (via quicky-setup)"], {
    stdio: "ignore",
    cwd: projectPath,
    loadingMessage: "Creating initial commit",
  });

  // Success message
  console.log("\nProject setup complete. Next steps:");
  log.info(`cd ${answers.projectName}`);
  if (answers.framework === "next") {
    log.info("npm run dev to start the development server");
    log.info("npm run dev:turbo to start with TurboPack");
  } else {
    log.info("npm run dev");
  }
  log.info(`package download footprint: ${packageDownloadSizeInMb(projectPath).toFixed(1)} MB`);
  log.info(`total time: ${formatDuration(Date.now() - startedAt)}`);
  console.log("\nHappy hacking!");
}
