import prompts from "prompts";
import chalk from 'chalk';

export type Framework = "react" | "next";
export type Language = "js" | "ts";
export type UiLibrary = "none" | "shadcn";
export type AdvancedMode = "skip" | "go_advanced";

const style = {
  highlight: chalk.hex("#FFD166").bold,
  prompt: chalk.hex("#4ECDC4").bold,
  muted: chalk.hex("#94A3B8"),
};

function promptMessage(text: string): string {
  return `${style.prompt("◆")} ${style.highlight(text)}`;
}

function validateProjectName(value: string): true | string {
  const normalized = value.trim();

  if (!normalized) {
    return "Project name is required.";
  }

  if (normalized.length > 80) {
    return "Use 80 characters or fewer.";
  }

  if (normalized.includes("\0") || normalized.includes("/") || normalized.includes("\\") || normalized.includes("..")) {
    return "Do not use path separators or traversal characters.";
  }

  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(normalized)) {
    return "Use only letters, numbers, dashes, and underscores. Start with a letter or number.";
  }

  if (["node_modules", "dist", "build", ".git"].includes(normalized.toLowerCase())) {
    return "That name is reserved.";
  }

  return true;
}

export interface Answers {
  projectName: string;
  framework: Framework;
  routing: "app" | "pages";
  language: Language;
  uiLibrary: UiLibrary;
  setupHusky: boolean;
  advancedMode: AdvancedMode;
  reactQuery: boolean;
  auth: boolean;
  forms: boolean;
  toasts: boolean;
  i18n: boolean;
  seo: boolean;
  tests: boolean;
}

export async function askQuestions(): Promise<Answers> {
  const result = await prompts([
    {
      type: "text",
      name: "projectName",
      message: promptMessage("Project name:"),
      initial: "my-app",
      validate: validateProjectName,
      format: (val: string) => style.highlight(val),
      style: 'default',
      onState: (state) => {
        if (state.aborted) {
          process.nextTick(() => process.exit(0));
        }
      }
    },
    {
      type: "select",
      name: "framework",
      message: promptMessage("Choose your framework:"),
      choices: [
        { title: "React (Vite)", value: "react" },
        { title: "Next.js", value: "next" },
      ],
    },
    {
      type: "select",
      name: "language",
      message: promptMessage("Choose your language:"),
      choices: [
        { title: "JavaScript", value: "js" },
        { title: "TypeScript", value: "ts" },
      ],
    },
    {
      type: (prev: string, values: any) =>
        values.framework === "next" ? "select" : null,
      name: "routing",
      message: promptMessage("Choose Next.js routing system:"),
      choices: [
        { title: "App Router (recommended)", value: "app" },
        { title: "Pages Router (classic)", value: "pages" },
      ],
    },
    {
      type: "select",
      name: "uiLibrary",
      message: promptMessage("Choose a UI library:"),
      choices: [
        { title: "None", value: "none" },
        { title: "Shadcn UI", value: "shadcn" },
      ],
    },
    {
      type: "confirm",
      name: "setupHusky",
      message: promptMessage("Set up Husky pre-commit hooks?"),
      initial: true,
    },
    {
      type: "select",
      name: "advancedMode",
      message: promptMessage("Advanced setup:"),
      choices: [
        { title: "Skip extra setup", value: "skip" },
        { title: "Go advanced", value: "go_advanced" },
      ],
    },
    {
      type: (prev: string, values: any) =>
        values.advancedMode === "go_advanced" ? "confirm" : null,
      name: "reactQuery",
      message: promptMessage("Add React Query?"),
      initial: true,
    },
    {
      type: (prev: string, values: any) =>
        values.advancedMode === "go_advanced" ? "confirm" : null,
      name: "auth",
      message: promptMessage("Add auth scaffold?"),
      initial: true,
    },
    {
      type: (prev: string, values: any) =>
        values.advancedMode === "go_advanced" ? "confirm" : null,
      name: "forms",
      message: promptMessage("Add forms stack?"),
      initial: true,
    },
    {
      type: (prev: string, values: any) =>
        values.advancedMode === "go_advanced" ? "confirm" : null,
      name: "toasts",
      message: promptMessage("Add toast system?"),
      initial: true,
    },
    {
      type: (prev: string, values: any) =>
        values.advancedMode === "go_advanced" ? "confirm" : null,
      name: "i18n",
      message: promptMessage("Add language support (i18n)?"),
      initial: false,
    },
    {
      type: (prev: string, values: any) =>
        values.advancedMode === "go_advanced" && values.framework === "next"
          ? "confirm"
          : null,
      name: "seo",
      message: promptMessage("Generate SEO metadata?"),
      initial: true,
    },
    {
      type: (prev: string, values: any) =>
        values.advancedMode === "go_advanced" ? "confirm" : null,
      name: "tests",
      message: promptMessage("Add test setup?"),
      initial: true,
    },
  ]);

  if (result.framework !== "next") {
    result.routing = "app";
    result.seo = false;
  }

  if (result.advancedMode !== "go_advanced") {
    result.reactQuery = false;
    result.auth = false;
    result.forms = false;
    result.toasts = false;
    result.i18n = false;
    result.tests = false;
    result.seo = false;
  }

  console.log(`\n${chalk.green('✓')} Configuration complete! Let's set up your project...\n`);
  return result as Answers;
}
