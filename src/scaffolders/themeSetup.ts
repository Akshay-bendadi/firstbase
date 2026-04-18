import fs from "fs";
import path from "path";
import type { Framework, UiLibrary } from "../prompts.js";

type Language = "js" | "ts";
type Router = "app" | "pages";

function ensureFileDir(filePath: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeIfChanged(filePath: string, content: string): void {
  ensureFileDir(filePath);

  if (fs.existsSync(filePath)) {
    const existing = fs.readFileSync(filePath, "utf8");
    if (existing.trim() === content.trim()) {
      console.log(`✅ No change needed: ${path.relative(process.cwd(), filePath)}`);
      return;
    }
  }

  fs.writeFileSync(filePath, content);
  console.log(`♻️  Wrote: ${path.relative(process.cwd(), filePath)}`);
}

function deleteIfExists(filePath: string): void {
  if (!fs.existsSync(filePath)) {
    return;
  }

  fs.unlinkSync(filePath);
  console.log(`🧹 Removed stale file: ${path.relative(process.cwd(), filePath)}`);
}

function getContentGlobs(framework: Framework, routing: Router): string[] {
  if (framework === "react") {
    return ["./index.html", "./src/**/*.{js,jsx,ts,tsx,mdx}"];
  }

  const shared = ["./components/**/*.{js,jsx,ts,tsx,mdx}", "./src/**/*.{js,jsx,ts,tsx,mdx}"];
  return routing === "app"
    ? ["./app/**/*.{js,jsx,ts,tsx,mdx}", ...shared]
    : ["./pages/**/*.{js,jsx,ts,tsx,mdx}", ...shared];
}

function tailwindConfigContent(language: Language, framework: Framework, routing: Router): string {
  const content = JSON.stringify(getContentGlobs(framework, routing), null, 2);
  const sharedTheme = `{
  darkMode: "class",
  content: ${content},
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "soft-float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out",
        "soft-float": "soft-float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
}`;

  if (language === "ts") {
    return `import type { Config } from "tailwindcss";

export default ${sharedTheme} satisfies Config;
`;
  }

  return `/** @type {import('tailwindcss').Config} */
module.exports = ${sharedTheme};
`;
}

function globalCssContent(): string {
  return `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 98%;
    --foreground: 222 22% 12%;
    --card: 0 0% 100%;
    --card-foreground: 222 22% 12%;
    --popover: 0 0% 100%;
    --popover-foreground: 222 22% 12%;
    --primary: 0 74% 47%;
    --primary-foreground: 0 0% 100%;
    --secondary: 0 0% 96%;
    --secondary-foreground: 0 0% 100%;
    --muted: 0 0% 95%;
    --muted-foreground: 220 9% 42%;
    --accent: 0 74% 47%;
    --accent-foreground: 0 0% 100%;
    --destructive: 0 84% 54%;
    --destructive-foreground: 0 0% 100%;
    --border: 220 13% 88%;
    --input: 220 13% 88%;
    --ring: 0 74% 47%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222 26% 8%;
    --foreground: 0 0% 98%;
    --card: 222 20% 11%;
    --card-foreground: 0 0% 98%;
    --popover: 222 20% 11%;
    --popover-foreground: 0 0% 98%;
    --primary: 0 74% 54%;
    --primary-foreground: 0 0% 100%;
    --secondary: 222 17% 14%;
    --secondary-foreground: 0 0% 98%;
    --muted: 222 17% 14%;
    --muted-foreground: 0 0% 72%;
    --accent: 0 74% 54%;
    --accent-foreground: 0 0% 100%;
    --destructive: 0 63% 41%;
    --destructive-foreground: 0 0% 98%;
    --border: 222 17% 16%;
    --input: 222 17% 16%;
    --ring: 0 74% 54%;
  }

  * {
    @apply border-border;
  }

  html {
    scroll-behavior: smooth;
  }

  body {
    @apply bg-background text-foreground antialiased;
    background-image:
      linear-gradient(to right, rgba(0, 0, 0, 0.035) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(0, 0, 0, 0.035) 1px, transparent 1px);
    background-size: 32px 32px;
  }

  body::before {
    content: "";
    position: fixed;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(to bottom, rgba(0, 0, 0, 0.03), transparent 16%);
    opacity: 0.55;
  }

  #root,
  body,
  html {
    min-height: 100%;
  }
}
`;
}

function cnUtilityContent(): string {
  return `import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
`;
}

function buttonComponentContent(language: Language): string {
  if (language === "ts") {
    return `import type { ButtonHTMLAttributes, DetailedHTMLProps } from "react";
import { cn } from "../../lib/utils";

type ButtonProps = DetailedHTMLProps<ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement> & {
  variant?: "default" | "secondary" | "outline";
};

const variants = {
  default: "bg-primary text-primary-foreground shadow-sm hover:opacity-90",
  secondary: "bg-secondary text-secondary-foreground hover:opacity-90",
  outline: "border border-border bg-transparent hover:bg-muted",
} as const;

export function Button({ className, variant = "default", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        variants[variant],
        className
      )}
      {...props}
    >
      {props.children}
    </button>
  );
}
`;
  }

  return `import { cn } from "../../lib/utils";

const variants = {
  default: "bg-primary text-primary-foreground shadow-sm hover:opacity-90",
  secondary: "bg-secondary text-secondary-foreground hover:opacity-90",
  outline: "border border-border bg-transparent hover:bg-muted",
};

export function Button({ className, variant = "default", ...props }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        variants[variant],
        className
      )}
      {...props}
    >
      {props.children}
    </button>
  );
}
`;
}

function cardComponentContent(language: Language): string {
  if (language === "ts") {
    return `import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: CardProps) {
  return (
    <div className={cn("rounded-3xl border border-white/10 bg-card/90 p-6 shadow-2xl backdrop-blur", className)} {...props}>
      {props.children}
    </div>
  );
}
`;
  }

  return `import { cn } from "../../lib/utils";

export function Card({ className, ...props }) {
  return (
    <div className={cn("rounded-3xl border border-white/10 bg-card/90 p-6 shadow-2xl backdrop-blur", className)} {...props}>
      {props.children}
    </div>
  );
}
`;
}

function themeTogglePath(projectPath: string, framework: Framework, language: Language): string {
  return framework === "react"
    ? path.join(projectPath, "src", "components", `theme-toggle.${fileExt(language)}`)
    : path.join(projectPath, "components", `theme-toggle.${fileExt(language)}`);
}

function themeToggleImportPath(framework: Framework, routing: Router): string {
  if (framework === "react") {
    return "./components/theme-toggle";
  }

  return routing === "app" ? "../components/theme-toggle" : "../components/theme-toggle";
}

function i18nImportPath(framework: Framework, routing: Router): string {
  if (framework === "react") {
    return "./lib/i18n";
  }

  return routing === "app" ? "../lib/i18n" : "../lib/i18n";
}

function advancedComponentImportPath(framework: Framework, routing: Router, fileName: string): string {
  if (framework === "react") {
    return `./components/${fileName}`;
  }

  return routing === "app" ? `../components/${fileName}` : `../components/${fileName}`;
}

function themeToggleContent(language: Language): string {
  if (language === "ts") {
    return `"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.localStorage.getItem("theme") === "dark" ? "dark" : "light";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const nextTheme = getInitialTheme();
    setTheme(nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  }, []);

  function toggleTheme() {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    window.localStorage.setItem("theme", nextTheme);
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-4 py-2 text-sm font-medium shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-lg"
      aria-label="Toggle dark and light theme"
    >
      <span className="text-base">{theme === "dark" ? "☀" : "☾"}</span>
      <span>{theme === "dark" ? "Light" : "Dark"}</span>
    </button>
  );
}
`;
  }

  return `"use client";

import { useEffect, useState } from "react";

function getInitialTheme() {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.localStorage.getItem("theme") === "dark" ? "dark" : "light";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const nextTheme = getInitialTheme();
    setTheme(nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    window.localStorage.setItem("theme", nextTheme);
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-4 py-2 text-sm font-medium shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-lg"
      aria-label="Toggle dark and light theme"
    >
      <span className="text-base">{theme === "dark" ? "☀" : "☾"}</span>
      <span>{theme === "dark" ? "Light" : "Dark"}</span>
    </button>
  );
}
`;
}

function landingPageContent(
  exportName: string,
  framework: Framework,
  routing: Router,
  uiLibrary: UiLibrary,
  seo: boolean,
  featureNotes: string[],
  i18n: boolean
): string {
  const toggleImport = themeToggleImportPath(framework, routing);
  const localeImport = i18n ? `import { LanguageSwitcher, useI18n } from "${i18nImportPath(framework, routing)}";` : "";
  const buttonImport =
    uiLibrary === "shadcn"
      ? framework === "react"
        ? `import { Button } from "./components/ui/button";`
        : routing === "app"
          ? `import { Button } from "../components/ui/button";`
          : `import { Button } from "../components/ui/button";`
      : "";
  const cardImport =
    uiLibrary === "shadcn"
      ? framework === "react"
        ? `import { Card } from "./components/ui/card";`
        : routing === "app"
          ? `import { Card } from "../components/ui/card";`
          : `import { Card } from "../components/ui/card";`
      : "";
  const hasAuth = featureNotes.some((note) => note.toLowerCase().includes("auth"));
  const hasForms = featureNotes.some((note) => note.toLowerCase().includes("forms"));
  const hasToasts = featureNotes.some((note) => note.toLowerCase().includes("toast"));
  const showcaseImport =
    hasAuth || hasForms || hasToasts
      ? `import { AdvancedShowcase } from "${advancedComponentImportPath(framework, routing, "advanced-showcase")}";`
      : "";

  const heroTitle = i18n ? '{t("heroTitle")}' : "A disciplined frontend foundation.";
  const heroDescription = i18n
    ? '{t("heroDescription")}'
    : "Quicky Setup composes Tailwind tokens, layout structure, optional shadcn wiring, env files, and commit hooks into one calm starting point.";
  const brandLabel = i18n ? '{t("brand")}' : "Quicky Setup";
  const systemFirstLabel = i18n ? '{t("systemFirst")}' : "System first";
  const launchLabel = i18n ? '{t("launchProject")}' : "Launch project";
  const productionBaselineLabel = i18n ? '{t("productionBaseline")}' : "Production baseline";
  const productionBaselineCopy = i18n
    ? '{t("productionBaselineCopy")}'
    : "Theme toggle, motion, shadcn-ready wiring, env files, and first commit setup are included.";
  const gridNoteLabel = i18n ? '{t("gridNote")}' : "Grid note";
  const gridNoteBody = i18n
    ? '{t("gridNoteBody")}'
    : "The composition stays flat, measured, and contrast-led so the page reads like a designed system rather than a demo of components.";
  const frontendStackLabel = i18n ? '{t("frontendStack")}' : "Frontend stack";
  const includedLabel = i18n ? '{t("included")}' : "Included";
  const includedTitle = i18n
    ? '{t("includedTitle")}'
    : "Theme tokens, component wiring, env handling, and commit hooks arrive before you write app logic.";
  const includedBody = i18n
    ? '{t("includedBody")}'
    : "The left rail stays fixed. The right rail carries the feature story, optional modules, and generated UI sections in a restrained grid.";
  const designSystemLabel = i18n ? '{t("designSystemLabel")}' : "Design system";
  const designSystemText = i18n ? '{t("designSystemText")}' : "Theme tokens, scale, and spacing are already mapped.";
  const frontendFlowLabel = i18n ? '{t("frontendFlowLabel")}' : "Frontend flow";
  const frontendFlowText = i18n ? '{t("frontendFlowText")}' : "Layouts, API client, and guardrails ship together.";
  const advancedModulesLabel = i18n ? '{t("advancedModulesLabel")}' : "Advanced modules";
  const advancedModulesText = i18n
    ? '{t("advancedModulesText")}'
    : "Auth, forms, toasts, React Query, tests, and i18n are opt-in.";
  const whatShipsLabel = i18n ? '{t("whatShips")}' : "What ships";
  const whatShipsBody = i18n
    ? '{t("whatShipsBody")}'
    : "The default build is opinionated: typography, motion, theming, and reusable UI are already in place.";

  const actionButton = uiLibrary === "shadcn"
    ? `<Button>${launchLabel}</Button>`
    : `<a
                href="#features"
                className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90"
              >
                ${launchLabel}
              </a>`;

  const infoCard = uiLibrary === "shadcn"
    ? `<Card className="grid gap-3 border-white/10 bg-background/80 shadow-xl">
              <p className="text-sm font-medium text-muted-foreground">${productionBaselineLabel}</p>
              <p className="text-lg font-semibold">${productionBaselineCopy}</p>
            </Card>`
    : `<div className="grid gap-3 rounded-3xl border border-white/10 bg-background/80 p-6 shadow-xl backdrop-blur">
              <p className="text-sm font-medium text-muted-foreground">${productionBaselineLabel}</p>
              <p className="text-lg font-semibold">${productionBaselineCopy}</p>
            </div>`;

  const seoHead =
    seo && framework === "next" && routing === "pages"
      ? `import Head from "next/head";

`
      : "";
  const seoMetadata =
    seo && framework === "next" && routing === "app"
      ? `export const metadata = {
  title: "Quicky Setup",
  description: "Fastest setup with the first commit already prepared.",
};

`
      : "";
  const seoMarkup =
    seo && framework === "next" && routing === "pages"
      ? `      <Head>
        <title>Quicky Setup</title>
        <meta name="description" content="Fastest setup with the first commit already prepared." />
      </Head>

`
      : "";

  const featureNotesBlock = featureNotes.length
    ? `${featureNotes.map((note) => `  "${note}",`).join("\n")}
`
    : "";
  const frontendSkills = [
    "React",
    "Next.js",
    "Tailwind CSS",
    "shadcn/ui",
    "React Query",
    "Husky",
    "Vitest",
    "Zod",
  ];
  const metrics = [
    { label: "Setup time", value: "< 1 min" },
    { label: "Starter pages", value: "Structured" },
    { label: "Theme mode", value: "Dark / Light" },
  ];
  const features = [
    "Tailwind tokens and CSS variables are pre-wired.",
    "Starter pages include real utility classes so the build has content to scan.",
    "Optional shadcn components are generated with a ready-to-use alias setup.",
    ...featureNotes,
  ];
  const sectionNotes = [
    {
      label: "Design system",
      text: "Theme tokens, scale, and spacing are already mapped.",
    },
    {
      label: "Frontend flow",
      text: "Layouts, API client, and guardrails ship together.",
    },
    {
      label: "Advanced modules",
      text: "Auth, forms, toasts, React Query, and tests are opt-in.",
    },
  ];
  const languageSwitcherMarkup = i18n ? `<LanguageSwitcher />` : "";
  const languageSwitcherImport = i18n ? `${localeImport}\n` : "";
  const i18nHookLine = i18n ? "  const { t } = useI18n();\n" : "";
  return `${seoHead}${buttonImport}${buttonImport ? "\n" : ""}${cardImport}${cardImport ? "\n" : ""}${showcaseImport}${showcaseImport ? "\n" : ""}${languageSwitcherImport}import { ThemeToggle } from "${toggleImport}";
${seoMetadata}

const metrics = ${JSON.stringify(metrics, null, 2)};
const features = ${JSON.stringify(features, null, 2)};
const sectionNotes = ${JSON.stringify(sectionNotes, null, 2)};
const frontendSkills = ${JSON.stringify(frontendSkills, null, 2)};

export default function ${exportName}() {
${i18nHookLine}
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background text-foreground lg:h-screen lg:overflow-hidden">
      ${seoMarkup}
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 pt-6 lg:px-8">
        <div className="inline-flex items-center gap-3 rounded-full border border-border bg-background/75 px-4 py-2 shadow-sm backdrop-blur">
          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <span className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            ${brandLabel}
          </span>
        </div>
        <div className="flex items-center gap-3">
          ${i18n ? languageSwitcherMarkup : ""}
          <ThemeToggle />
        </div>
      </header>

      <section className="relative z-10 mx-auto grid max-w-6xl gap-12 px-6 py-12 lg:h-[calc(100vh-88px)] lg:grid-cols-[1.05fr_0.95fr] lg:items-start lg:px-8 lg:py-8">
        <div className="space-y-8 lg:sticky lg:top-8 lg:self-start lg:pr-4">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.34em] text-muted-foreground">
              <span className="h-px w-12 bg-gradient-to-r from-primary to-transparent" />
              ${systemFirstLabel}
            </div>
            <h1 className="max-w-3xl text-balance text-5xl font-semibold leading-[0.96] tracking-[-0.05em] sm:text-6xl lg:text-[4.75rem]">
              ${heroTitle}
            </h1>
            <p className="max-w-2xl text-pretty text-lg leading-8 text-muted-foreground sm:text-xl">
              ${heroDescription}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            ${actionButton}
          </div>
          <div className="rounded-[1.75rem] border border-border bg-background/70 p-4 shadow-sm backdrop-blur">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.34em] text-muted-foreground">
              ${gridNoteLabel}
            </p>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              ${gridNoteBody}
            </p>
          </div>
          <div className="grid gap-3">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.34em] text-muted-foreground">
              ${frontendStackLabel}
            </p>
            <div className="flex flex-wrap gap-2">
              {frontendSkills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full border border-border bg-background/75 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-[1.75rem] border border-border bg-background/75 p-4 shadow-sm backdrop-blur">
                <p className="text-[0.65rem] uppercase tracking-[0.28em] text-muted-foreground">{metric.label}</p>
                <p className="mt-3 font-mono text-2xl font-semibold tracking-[-0.03em]">{metric.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4 lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto lg:pr-2">
          <div className="rounded-[2rem] border border-border bg-background/70 p-5 shadow-sm backdrop-blur">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.34em] text-muted-foreground">
              ${includedLabel}
            </p>
            <p className="mt-3 text-2xl font-semibold leading-tight tracking-[-0.04em]">
              ${includedTitle}
            </p>
            <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground">
              ${includedBody}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {sectionNotes.map((section) => (
              <div key={section.label} className="rounded-[1.5rem] border border-border bg-background/80 p-4 shadow-sm backdrop-blur">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.34em] text-muted-foreground">
                  {section.label}
                </p>
                <p className="mt-3 text-sm leading-7 text-foreground">
                  {section.text}
                </p>
              </div>
            ))}
          </div>

          ${infoCard}
          ${hasAuth || hasForms || hasToasts ? `<AdvancedShowcase />` : ""}
          <div id="features" className="grid gap-4">
            <div className="space-y-1 px-1">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.34em] text-muted-foreground">
                ${whatShipsLabel}
              </p>
              <p className="max-w-xl text-sm leading-7 text-muted-foreground">
                ${whatShipsBody}
              </p>
            </div>
            {features.map((feature, index) => (
              <div key={feature} className="group rounded-[1.75rem] border border-border bg-background/80 p-4 shadow-sm transition hover:border-primary/40">
                <div className="flex items-start gap-4">
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-muted font-mono text-sm font-semibold text-muted-foreground transition group-hover:bg-primary group-hover:text-primary-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="space-y-1">
                    <p className="text-base font-semibold leading-7 tracking-[-0.02em]">{feature}</p>
                    <p className="text-sm leading-6 text-muted-foreground">
                      Built into the scaffold so the starter stays production-oriented from the first commit.
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
`;
}

function baseHeroContent(language: Language, uiLibrary: UiLibrary, seo: boolean, featureNotes: string[], i18n: boolean): string {
  void language;
  return landingPageContent("App", "react", "app", uiLibrary, seo, featureNotes, i18n);
}

function nextPageContent(language: Language, uiLibrary: UiLibrary, seo: boolean, featureNotes: string[], i18n: boolean): string {
  void language;
  return landingPageContent("Page", "next", "app", uiLibrary, seo, featureNotes, i18n);
}

function pagesIndexContent(uiLibrary: UiLibrary, seo: boolean, featureNotes: string[], i18n: boolean): string {
  return landingPageContent("Home", "next", "pages", uiLibrary, seo, featureNotes, i18n);
}

function componentsJsonContent(framework: Framework, language: Language): string {
  const configFile = `tailwind.config.${language}`;
  return JSON.stringify(
    {
      $schema: "https://ui.shadcn.com/schema.json",
      style: "new-york",
      rsc: framework === "next",
      tailwind: {
        config: configFile,
        css: framework === "next" ? "app/globals.css" : "src/index.css",
        baseColor: "slate",
        cssVariables: true,
      },
      aliases: {
        components: "@/components",
        utils: "@/lib/utils",
      },
    },
    null,
    2
  );
}

function fileExt(language: Language): string {
  return language === "ts" ? "tsx" : "jsx";
}

function viteConfigContent(language: Language): string {
  if (language === "ts") {
    return `import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
`;
  }

  return `import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
`;
}

function shadcnButtonPath(projectPath: string, framework: Framework, language: Language): string {
  return framework === "next"
    ? path.join(projectPath, "components", `ui/button.${fileExt(language)}`)
    : path.join(projectPath, "src", "components", "ui", `button.${fileExt(language)}`);
}

function shadcnCardPath(projectPath: string, framework: Framework, language: Language): string {
  return framework === "next"
    ? path.join(projectPath, "components", `ui/card.${fileExt(language)}`)
    : path.join(projectPath, "src", "components", "ui", `card.${fileExt(language)}`);
}

function utilsPath(projectPath: string, framework: Framework): string {
  return framework === "next"
    ? path.join(projectPath, "lib", "utils.ts")
    : path.join(projectPath, "src", "lib", "utils.ts");
}

function oppositeExt(language: Language): string {
  return language === "ts" ? "js" : "ts";
}

export async function scaffoldTheme(
  projectPath: string,
  language: Language,
  routing: Router,
  framework: Framework,
  uiLibrary: UiLibrary,
  seo: boolean,
  featureNotes: string[],
  i18n: boolean
): Promise<void> {
  console.log(`🎨 Setting up theme for ${framework} (${routing} router)...`);

  const configFile = path.join(projectPath, `tailwind.config.${language}`);
  writeIfChanged(configFile, tailwindConfigContent(language, framework, routing));

  const cssFile =
    framework === "next"
      ? path.join(projectPath, routing === "app" ? "app" : "styles", "globals.css")
      : path.join(projectPath, "src", "index.css");

  writeIfChanged(cssFile, globalCssContent());

  if (framework === "react") {
    writeIfChanged(
      path.join(projectPath, "postcss.config.cjs"),
      `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`
    );
    writeIfChanged(path.join(projectPath, `vite.config.${language}`), viteConfigContent(language));
  } else {
    writeIfChanged(
      path.join(projectPath, "postcss.config.cjs"),
      `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`
    );
  }

  if (uiLibrary === "shadcn") {
    writeIfChanged(path.join(projectPath, "components.json"), componentsJsonContent(framework, language));
    writeIfChanged(utilsPath(projectPath, framework), cnUtilityContent());
    writeIfChanged(shadcnButtonPath(projectPath, framework, language), buttonComponentContent(language));
    writeIfChanged(shadcnCardPath(projectPath, framework, language), cardComponentContent(language));
  }

  writeIfChanged(themeTogglePath(projectPath, framework, language), themeToggleContent(language));

  const starterPagePath =
    framework === "next"
      ? path.join(projectPath, routing === "app" ? "app" : "pages", routing === "app" ? `page.${fileExt(language)}` : `index.${fileExt(language)}`)
      : path.join(projectPath, "src", `App.${fileExt(language)}`);

  const starterContent =
    framework === "react"
      ? baseHeroContent(language, uiLibrary, seo, featureNotes, i18n)
      : routing === "app"
        ? nextPageContent(language, uiLibrary, seo, featureNotes, i18n)
        : pagesIndexContent(uiLibrary, seo, featureNotes, i18n);

  writeIfChanged(starterPagePath, starterContent);
}
