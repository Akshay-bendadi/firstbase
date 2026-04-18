import fs from "fs";
import path from "path";
import type { Answers, Language } from "../prompts.js";

function ensureDir(filePath: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeIfChanged(filePath: string, content: string): void {
  ensureDir(filePath);

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

function isTs(language: Language): boolean {
  return language === "ts";
}

function rootPath(projectPath: string, relPath: string): string {
  return path.join(projectPath, relPath);
}

function componentPath(projectPath: string, answers: Answers, fileName: string): string {
  return answers.framework === "react"
    ? rootPath(projectPath, path.join("src", "components", fileName))
    : rootPath(projectPath, path.join("components", fileName));
}

function libPath(projectPath: string, answers: Answers, fileName: string): string {
  return answers.framework === "react"
    ? rootPath(projectPath, path.join("src", "lib", fileName))
    : rootPath(projectPath, path.join("lib", fileName));
}

function ext(language: Language, tsExt: string, jsExt: string): string {
  return language === "ts" ? tsExt : jsExt;
}

function oppositeExt(language: Language): string {
  return language === "ts" ? "js" : "ts";
}

function needsProviders(answers: Answers): boolean {
  return answers.reactQuery || answers.auth || answers.toasts || answers.i18n;
}

function reactQueryClientContent(language: Language): string {
  void language;
  return `import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30_000,
    },
  },
});
`;
}

function authProviderContent(language: Language): string {
  if (isTs(language)) {
    return `"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type AuthUser = {
  name: string;
  email: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (user: AuthUser) => void;
  logout: () => void;
};

const AUTH_STORAGE_KEY = "quicky-setup-user";
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredUser(): AuthUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as AuthUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setUser(readStoredUser());
  }, []);

  function login(nextUser: AuthUser) {
    setUser(nextUser);
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextUser));
  }

  function logout() {
    setUser(null);
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      login,
      logout,
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
`;
  }

  return `"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

const AUTH_STORAGE_KEY = "quicky-setup-user";
const AuthContext = createContext(undefined);

function readStoredUser() {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    setUser(readStoredUser());
  }, []);

  function login(nextUser) {
    setUser(nextUser);
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextUser));
  }

  function logout() {
    setUser(null);
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  }

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      login,
      logout,
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
`;
}

function i18nProviderContent(language: Language): string {
  if (isTs(language)) {
    return `"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type Locale = "en" | "es";
type CopyKey =
  | "brand"
  | "systemFirst"
  | "heroTitle"
  | "heroDescription"
  | "launchProject"
  | "productionBaseline"
  | "productionBaselineCopy"
  | "gridNote"
  | "gridNoteBody"
  | "frontendStack"
  | "included"
  | "includedTitle"
  | "includedBody"
  | "designSystemLabel"
  | "designSystemText"
  | "frontendFlowLabel"
  | "frontendFlowText"
  | "advancedModulesLabel"
  | "advancedModulesText"
  | "whatShips"
  | "whatShipsBody"
  | "featureTailwind"
  | "featureScan"
  | "featureShadcn"
  | "featureQuery"
  | "featureAuth"
  | "featureForms"
  | "featureToasts"
  | "featureI18n"
  | "setupTime"
  | "starterPages"
  | "themeMode";

type TranslationMap = Record<CopyKey, string>;

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: CopyKey) => string;
};

const STORAGE_KEY = "quicky-setup-locale";
const translations: Record<Locale, TranslationMap> = {
  en: {
    brand: "Quicky Setup",
    systemFirst: "System first",
    heroTitle: "A disciplined frontend foundation.",
    heroDescription:
      "Quicky Setup composes Tailwind tokens, layout structure, optional shadcn wiring, env files, and commit hooks into one calm starting point.",
    launchProject: "Launch project",
    productionBaseline: "Production baseline",
    productionBaselineCopy:
      "Theme toggle, motion, shadcn-ready wiring, env files, and first commit setup are included.",
    gridNote: "Grid note",
    gridNoteBody:
      "The composition stays flat, measured, and contrast-led so the page reads like a designed system rather than a demo of components.",
    frontendStack: "Frontend stack",
    included: "Included",
    includedTitle:
      "Theme tokens, component wiring, env handling, and commit hooks arrive before you write app logic.",
    includedBody:
      "The left rail stays fixed. The right rail carries the feature story, optional modules, and generated UI sections in a restrained grid.",
    designSystemLabel: "Design system",
    designSystemText: "Theme tokens, scale, and spacing are already mapped.",
    frontendFlowLabel: "Frontend flow",
    frontendFlowText: "Layouts, API client, and guardrails ship together.",
    advancedModulesLabel: "Advanced modules",
    advancedModulesText: "Auth, forms, toasts, React Query, tests, and i18n are opt-in.",
    whatShips: "What ships",
    whatShipsBody:
      "The default build is opinionated: typography, motion, theming, and reusable UI are already in place.",
    featureTailwind: "Tailwind tokens and CSS variables are pre-wired.",
    featureScan: "Starter pages include real utility classes so the build has content to scan.",
    featureShadcn: "Optional shadcn components are generated with a ready-to-use alias setup.",
    featureQuery: "React Query is scaffolded with a shared client and provider.",
    featureAuth: "Auth state is prepared with a local sign-in panel.",
    featureForms: "Validated forms ship with React Hook Form and Zod.",
    featureToasts: "Sonner toasts are ready for feedback flows.",
    featureI18n: "Language switching keeps the starter ready for localized products.",
    setupTime: "Setup time",
    starterPages: "Starter pages",
    themeMode: "Theme mode",
  },
  es: {
    brand: "Quicky Setup",
    systemFirst: "Sistema primero",
    heroTitle: "Una base frontend disciplinada.",
    heroDescription:
      "Quicky Setup combina tokens de Tailwind, estructura visual, wiring opcional de shadcn, archivos de entorno y hooks de commit en un punto de partida tranquilo.",
    launchProject: "Iniciar proyecto",
    productionBaseline: "Base de producción",
    productionBaselineCopy:
      "El toggle de tema, motion, wiring listo para shadcn, archivos env y el primer commit ya vienen incluidos.",
    gridNote: "Nota de grid",
    gridNoteBody:
      "La composición se mantiene plana, medida y con contraste para que la página se lea como un sistema diseñado y no como una demo.",
    frontendStack: "Stack frontend",
    included: "Incluido",
    includedTitle:
      "Tokens de diseño, wiring de componentes, manejo de env y hooks de commit llegan antes del código de negocio.",
    includedBody:
      "La columna izquierda queda fija. La derecha muestra la historia visual, módulos opcionales y secciones UI en una grilla contenida.",
    designSystemLabel: "Sistema de diseño",
    designSystemText: "Tokens, escala y espaciado ya están definidos.",
    frontendFlowLabel: "Flujo frontend",
    frontendFlowText: "Layouts, API client y guardrails vienen juntos.",
    advancedModulesLabel: "Módulos avanzados",
    advancedModulesText: "Auth, forms, toasts, React Query, tests e i18n son opcionales.",
    whatShips: "Qué incluye",
    whatShipsBody:
      "El build por defecto es intencional: tipografía, motion, tema y UI reutilizable ya están preparados.",
    featureTailwind: "Los tokens de Tailwind y las variables CSS ya están configurados.",
    featureScan: "Las páginas base incluyen utilidades reales para que el build detecte contenido.",
    featureShadcn: "Los componentes shadcn opcionales se generan con alias listo para usar.",
    featureQuery: "React Query se prepara con cliente y provider compartidos.",
    featureAuth: "El estado de auth queda listo con un panel local de acceso.",
    featureForms: "Los formularios validados llegan con React Hook Form y Zod.",
    featureToasts: "Los toasts de Sonner quedan listos para feedback.",
    featureI18n: "El cambio de idioma deja el starter listo para productos localizados.",
    setupTime: "Tiempo de setup",
    starterPages: "Páginas base",
    themeMode: "Modo de tema",
  },
};

function readStoredLocale(): Locale {
  if (typeof window === "undefined") {
    return "en";
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "es" ? "es" : "en";
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    setLocaleState(readStoredLocale());
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  function setLocale(nextLocale: Locale) {
    setLocaleState(nextLocale);
    window.localStorage.setItem(STORAGE_KEY, nextLocale);
  }

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key) => translations[locale][key] ?? translations.en[key],
    }),
    [locale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }

  return context;
}

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 p-1 shadow-sm backdrop-blur">
      {(["en", "es"] as const).map((candidate) => (
        <button
          key={candidate}
          type="button"
          onClick={() => setLocale(candidate)}
          className={\`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] transition \${
            locale === candidate ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
          }\`}
          aria-pressed={locale === candidate}
        >
          {candidate}
        </button>
      ))}
    </div>
  );
}
`;
  }

  return `"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "quicky-setup-locale";
const translations = {
  en: {
    brand: "Quicky Setup",
    systemFirst: "System first",
    heroTitle: "A disciplined frontend foundation.",
    heroDescription:
      "Quicky Setup composes Tailwind tokens, layout structure, optional shadcn wiring, env files, and commit hooks into one calm starting point.",
    launchProject: "Launch project",
    productionBaseline: "Production baseline",
    productionBaselineCopy:
      "Theme toggle, motion, shadcn-ready wiring, env files, and first commit setup are included.",
    gridNote: "Grid note",
    gridNoteBody:
      "The composition stays flat, measured, and contrast-led so the page reads like a designed system rather than a demo of components.",
    frontendStack: "Frontend stack",
    included: "Included",
    includedTitle:
      "Theme tokens, component wiring, env handling, and commit hooks arrive before you write app logic.",
    includedBody:
      "The left rail stays fixed. The right rail carries the feature story, optional modules, and generated UI sections in a restrained grid.",
    designSystemLabel: "Design system",
    designSystemText: "Theme tokens, scale, and spacing are already mapped.",
    frontendFlowLabel: "Frontend flow",
    frontendFlowText: "Layouts, API client, and guardrails ship together.",
    advancedModulesLabel: "Advanced modules",
    advancedModulesText: "Auth, forms, toasts, React Query, tests, and i18n are opt-in.",
    whatShips: "What ships",
    whatShipsBody:
      "The default build is opinionated: typography, motion, theming, and reusable UI are already in place.",
    featureTailwind: "Tailwind tokens and CSS variables are pre-wired.",
    featureScan: "Starter pages include real utility classes so the build has content to scan.",
    featureShadcn: "Optional shadcn components are generated with a ready-to-use alias setup.",
    featureQuery: "React Query is scaffolded with a shared client and provider.",
    featureAuth: "Auth state is prepared with a local sign-in panel.",
    featureForms: "Validated forms ship with React Hook Form and Zod.",
    featureToasts: "Sonner toasts are ready for feedback flows.",
    featureI18n: "Language switching keeps the starter ready for localized products.",
    setupTime: "Setup time",
    starterPages: "Starter pages",
    themeMode: "Theme mode",
  },
  es: {
    brand: "Quicky Setup",
    systemFirst: "Sistema primero",
    heroTitle: "Una base frontend disciplinada.",
    heroDescription:
      "Quicky Setup combina tokens de Tailwind, estructura visual, wiring opcional de shadcn, archivos de entorno y hooks de commit en un punto de partida tranquilo.",
    launchProject: "Iniciar proyecto",
    productionBaseline: "Base de producción",
    productionBaselineCopy:
      "El toggle de tema, motion, wiring listo para shadcn, archivos env y el primer commit ya vienen incluidos.",
    gridNote: "Nota de grid",
    gridNoteBody:
      "La composición se mantiene plana, medida y con contraste para que la página se lea como un sistema diseñado y no como una demo.",
    frontendStack: "Stack frontend",
    included: "Incluido",
    includedTitle:
      "Tokens de diseño, wiring de componentes, manejo de env y hooks de commit llegan antes del código de negocio.",
    includedBody:
      "La columna izquierda queda fija. La derecha muestra la historia visual, módulos opcionales y secciones UI en una grilla contenida.",
    designSystemLabel: "Sistema de diseño",
    designSystemText: "Tokens, escala y espaciado ya están definidos.",
    frontendFlowLabel: "Flujo frontend",
    frontendFlowText: "Layouts, API client y guardrails vienen juntos.",
    advancedModulesLabel: "Módulos avanzados",
    advancedModulesText: "Auth, forms, toasts, React Query, tests e i18n son opcionales.",
    whatShips: "Qué incluye",
    whatShipsBody:
      "El build por defecto es intencional: tipografía, motion, tema y UI reutilizable ya están preparados.",
    featureTailwind: "Los tokens de Tailwind y las variables CSS ya están configurados.",
    featureScan: "Las páginas base incluyen utilidades reales para que el build detecte contenido.",
    featureShadcn: "Los componentes shadcn opcionales se generan con alias listo para usar.",
    featureQuery: "React Query se prepara con cliente y provider compartidos.",
    featureAuth: "El estado de auth queda listo con un panel local de acceso.",
    featureForms: "Los formularios validados llegan con React Hook Form y Zod.",
    featureToasts: "Los toasts de Sonner quedan listos para feedback.",
    featureI18n: "El cambio de idioma deja el starter listo para productos localizados.",
    setupTime: "Tiempo de setup",
    starterPages: "Páginas base",
    themeMode: "Modo de tema",
  },
};

function readStoredLocale() {
  if (typeof window === "undefined") {
    return "en";
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "es" ? "es" : "en";
}

const I18nContext = createContext(undefined);

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState("en");

  useEffect(() => {
    setLocaleState(readStoredLocale());
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  function setLocale(nextLocale) {
    setLocaleState(nextLocale);
    window.localStorage.setItem(STORAGE_KEY, nextLocale);
  }

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t: (key) => translations[locale][key] ?? translations.en[key],
    }),
    [locale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }

  return context;
}

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 p-1 shadow-sm backdrop-blur">
      {["en", "es"].map((candidate) => (
        <button
          key={candidate}
          type="button"
          onClick={() => setLocale(candidate)}
          className={\`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] transition \${
            locale === candidate ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
          }\`}
          aria-pressed={locale === candidate}
        >
          {candidate}
        </button>
      ))}
    </div>
  );
}
`;
}

function authPanelContent(answers: Answers): string {
  const ts = isTs(answers.language);
  return `"use client";

${ts ? `import type { FormEvent } from "react";\n` : ""}
import { useState } from "react";
import { useAuth } from "../lib/auth";

export function AuthPanel() {
  const { user, isAuthenticated, login, logout } = useAuth();
  const [name, setName] = useState("Avery");
  const [email, setEmail] = useState("avery@example.com");

  function handleSubmit(event${ts ? `: FormEvent<HTMLFormElement>` : ""}) {
    event.preventDefault();
    login({ name, email });
  }

  return (
    <section className="grid gap-4 rounded-3xl border border-border bg-background/80 p-6 shadow-xl backdrop-blur">
      <div className="space-y-1">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Auth scaffold</p>
        <h2 className="text-2xl font-semibold">{isAuthenticated && user ? "Welcome back, " + user.name : "Ready for sign in"}</h2>
      </div>

      {isAuthenticated && user ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            Sign out
          </button>
        </div>
      ) : (
        <form className="grid gap-3" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm font-medium">
            Name
            <input
              className="rounded-2xl border border-border bg-background px-4 py-3 outline-none ring-0 focus:border-primary"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Avery"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Email
            <input
              className="rounded-2xl border border-border bg-background px-4 py-3 outline-none ring-0 focus:border-primary"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="avery@example.com"
              type="email"
            />
          </label>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            Sign in
          </button>
        </form>
      )}
    </section>
  );
}
`;
}

function advancedShowcaseContent(answers: Answers): string {
  const ts = isTs(answers.language);
  const sections = [
    answers.auth ? "auth" : "",
    answers.forms ? "forms" : "",
    answers.toasts ? "toasts" : "",
  ].filter(Boolean);

  const initialKey = sections[0] ?? "auth";
  const showcaseKeyType = ts ? `type ShowcaseKey = "auth" | "forms" | "toasts";\n\n` : "";
  const tabsType = ts ? `const tabs: Array<{ key: ShowcaseKey; label: string }> = [` : `const tabs = [`;
  const activeState = ts
    ? `useState<ShowcaseKey>("${initialKey}" as ShowcaseKey)`
    : `useState("${initialKey}")`;
  return `"use client";

import { useState } from "react";
import { AuthPanel } from "./auth-panel";
import { ContactForm } from "./contact-form";
import { ToastDemo } from "./toast-demo";

${showcaseKeyType}${tabsType}
  ${answers.auth ? `{ key: "auth", label: "Auth" },` : ""}
  ${answers.forms ? `{ key: "forms", label: "Forms" },` : ""}
  ${answers.toasts ? `{ key: "toasts", label: "Toasts" },` : ""}
];

export function AdvancedShowcase() {
  const [active, setActive] = ${activeState};

  return (
    <section className="grid gap-4 rounded-3xl border border-border bg-background/80 p-6 shadow-xl backdrop-blur">
      <div className="space-y-1">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Advanced options</p>
        <h2 className="text-2xl font-semibold">Click to switch between the selected extras</h2>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActive(tab.key)}
            className={\`rounded-full border px-4 py-2 text-sm font-medium transition \${
              active === tab.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-transparent hover:bg-muted"
            }\`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4">
        {active === "auth" ? <AuthPanel /> : null}
        {active === "forms" ? <ContactForm /> : null}
        {active === "toasts" ? <ToastDemo /> : null}
      </div>
    </section>
  );
}
`;
}

function providersContent(answers: Answers): string {
  const ts = isTs(answers.language);
  const imports: string[] = [];

  if (answers.reactQuery) {
    imports.push(`import { QueryClientProvider } from "@tanstack/react-query";`);
    imports.push(`import { queryClient } from "../lib/query-client";`);
  }

  if (answers.auth) {
    imports.push(`import { AuthProvider } from "../lib/auth";`);
  }

  if (answers.toasts) {
    imports.push(`import { Toaster } from "sonner";`);
  }

  if (answers.i18n) {
    imports.push(`import { I18nProvider } from "../lib/i18n";`);
  }

  const fragmentBody = `    <>
      {children}
${answers.toasts ? `      <Toaster richColors position="top-right" />\n` : ""}    </>`;
  const authWrapped = answers.auth
    ? `    <AuthProvider>
${fragmentBody}
    </AuthProvider>`
    : fragmentBody;
  const i18nWrapped = answers.i18n
    ? `    <I18nProvider>
${authWrapped}
    </I18nProvider>`
    : authWrapped;
  const queryWrapped = answers.reactQuery
    ? `    <QueryClientProvider client={queryClient}>
${i18nWrapped}
    </QueryClientProvider>`
    : i18nWrapped;

  return `"use client";

${ts ? `import type { ReactNode } from "react";\n` : ""}${imports.join("\n")}
${ts ? `\ntype ProvidersProps = { children: ReactNode };` : ""}

export function Providers({ children }${ts ? ": ProvidersProps" : ""}) {
  return (
${queryWrapped}
  );
}
`;
}

function reactMainContent(answers: Answers): string {
  const rootTarget =
    answers.language === "ts"
      ? `document.getElementById("root") as HTMLElement`
      : `document.getElementById("root")`;

  return `import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { Providers } from "./components/providers";
import "./index.css";

ReactDOM.createRoot(${rootTarget}).render(
  <React.StrictMode>
    <Providers>
      <App />
    </Providers>
  </React.StrictMode>
);
`;
}

function nextProvidersLayoutContent(answers: Answers): string {
  const metadata = answers.seo
    ? `export const metadata = {
  title: "Quicky Setup",
  description: "Fastest setup with the first commit already prepared.",
};

`
    : "";

  return `${isTs(answers.language) ? `import type { ReactNode } from "react";` : ""}
import "./globals.css";
import { Providers } from "../components/providers";
${metadata}export default function RootLayout({ children }${isTs(answers.language) ? ": { children: ReactNode }" : ""}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
`;
}

function vitestConfigContent(language: Language): string {
  const ts = isTs(language);
  const setupFile = `./test/setup.${language}`;
  return `${ts ? `import { defineConfig } from "vitest/config";` : `import { defineConfig } from "vitest/config";`}

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: "${setupFile}",
  },
});
`;
}

function vitestSetupContent(): string {
  return `import "@testing-library/jest-dom/vitest";
`;
}

function themeToggleTestContent(answers: Answers): string {
  const importPath =
    answers.framework === "react"
      ? "../src/components/theme-toggle"
      : "../components/theme-toggle";
  return `import { render, screen } from "@testing-library/react";
import { ThemeToggle } from "${importPath}";

describe("ThemeToggle", () => {
  it("renders the toggle button", () => {
    render(<ThemeToggle />);
    expect(screen.getByRole("button", { name: /toggle dark and light theme/i })).toBeInTheDocument();
  });
});
`;
}

function contactFormContent(answers: Answers): string {
  const ts = isTs(answers.language);
  const toastImport = answers.toasts ? `import { toast } from "sonner";` : "";
  const toastBody = answers.toasts
    ? `    toast.success("Your message is ready for production flow.");`
    : `    console.log("Contact form submitted:", values);`;

  return `"use client";

${ts ? `import type { SubmitHandler } from "react-hook-form";\n` : ""}
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
${toastImport}

const contactFormSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Enter a valid email"),
  message: z.string().min(10, "Message should be at least 10 characters"),
});

${ts ? `type ContactFormValues = z.infer<typeof contactFormSchema>;` : ""}

export function ContactForm() {
  const form = useForm${ts ? `<ContactFormValues>` : ""}({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      email: "",
      message: "",
    },
  });

  const onSubmit${ts ? `: SubmitHandler<ContactFormValues>` : ""} = (values) => {
${toastBody}
    form.reset();
  };

  return (
    <section className="grid gap-4 rounded-3xl border border-border bg-background/80 p-6 shadow-xl backdrop-blur">
      <div className="space-y-1">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Forms stack</p>
        <h2 className="text-2xl font-semibold">Zod + React Hook Form</h2>
      </div>

      <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
        <label className="grid gap-2 text-sm font-medium">
          Name
          <input
            className="rounded-2xl border border-border bg-background px-4 py-3 outline-none ring-0 focus:border-primary"
            {...form.register("name")}
            placeholder="Avery"
          />
          {form.formState.errors.name ? (
            <span className="text-xs text-red-500">{form.formState.errors.name.message}</span>
          ) : null}
        </label>

        <label className="grid gap-2 text-sm font-medium">
          Email
          <input
            className="rounded-2xl border border-border bg-background px-4 py-3 outline-none ring-0 focus:border-primary"
            {...form.register("email")}
            placeholder="avery@example.com"
            type="email"
          />
          {form.formState.errors.email ? (
            <span className="text-xs text-red-500">{form.formState.errors.email.message}</span>
          ) : null}
        </label>

        <label className="grid gap-2 text-sm font-medium">
          Message
          <textarea
            className="min-h-[130px] rounded-3xl border border-border bg-background px-4 py-3 outline-none ring-0 focus:border-primary"
            {...form.register("message")}
            placeholder="Tell us what you want to build..."
          />
          {form.formState.errors.message ? (
            <span className="text-xs text-red-500">{form.formState.errors.message.message}</span>
          ) : null}
        </label>

        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={form.formState.isSubmitting}
        >
          Send message
        </button>
      </form>
    </section>
  );
}
`;
}

function toastDemoContent(): string {
  return `"use client";

import { toast } from "sonner";

export function ToastDemo() {
  return (
    <section className="grid gap-4 rounded-3xl border border-border bg-background/80 p-6 shadow-xl backdrop-blur">
      <div className="space-y-1">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Toast system</p>
        <h2 className="text-2xl font-semibold">Sonner is wired and ready</h2>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => toast.success("Everything is working.")}
          className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          Success toast
        </button>
        <button
          type="button"
          onClick={() => toast.error("Something needs attention.")}
          className="inline-flex items-center justify-center rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:bg-muted"
        >
          Error toast
        </button>
      </div>
    </section>
  );
}
`;
}

function renderPageFeatureNotes(answers: Answers): string[] {
  const notes: string[] = [];

  if (answers.reactQuery) {
    notes.push("React Query provider and client");
  }

  if (answers.auth) {
    notes.push("Auth provider and demo panel");
  }

  if (answers.forms) {
    notes.push("Validated forms with React Hook Form");
  }

  if (answers.toasts) {
    notes.push("Sonner toast system");
  }

  if (answers.i18n) {
    notes.push("Language switching");
  }

  if (answers.tests) {
    notes.push("Vitest test baseline");
  }

  return notes;
}

export function scaffoldAdvancedSetup(projectPath: string, answers: Answers): void {
  if (answers.reactQuery) {
    writeIfChanged(libPath(projectPath, answers, `query-client.${answers.language}`), reactQueryClientContent(answers.language));
  }

  if (answers.auth) {
    const authExt = ext(answers.language, "tsx", "jsx");
    writeIfChanged(libPath(projectPath, answers, `auth.${authExt}`), authProviderContent(answers.language));
    deleteIfExists(libPath(projectPath, answers, `auth.${oppositeExt(answers.language)}`));
    writeIfChanged(componentPath(projectPath, answers, `auth-panel.${authExt}`), authPanelContent(answers));
    deleteIfExists(componentPath(projectPath, answers, `auth-panel.${oppositeExt(answers.language)}`));
  }

  if (answers.auth || answers.forms || answers.toasts) {
    const showcaseExt = ext(answers.language, "tsx", "jsx");
    writeIfChanged(
      componentPath(projectPath, answers, `advanced-showcase.${showcaseExt}`),
      advancedShowcaseContent(answers)
    );
    deleteIfExists(componentPath(projectPath, answers, `advanced-showcase.${oppositeExt(answers.language)}`));
  }

  if (needsProviders(answers)) {
    const providerExt = ext(answers.language, "tsx", "jsx");
    writeIfChanged(
      componentPath(projectPath, answers, `providers.${providerExt}`),
      providersContent(answers)
    );
    deleteIfExists(componentPath(projectPath, answers, `providers.${oppositeExt(answers.language)}`));

    if (answers.framework === "react") {
      const mainExt = answers.language === "ts" ? "tsx" : "jsx";
      writeIfChanged(rootPath(projectPath, `src/main.${mainExt}`), reactMainContent(answers));
      deleteIfExists(rootPath(projectPath, `src/main.${answers.language === "ts" ? "js" : "ts"}`));
    } else if (answers.routing === "app") {
      const layoutExt = ext(answers.language, "tsx", "jsx");
      writeIfChanged(rootPath(projectPath, `app/layout.${layoutExt}`), nextProvidersLayoutContent(answers));
      deleteIfExists(rootPath(projectPath, `app/layout.${oppositeExt(answers.language)}`));
    } else {
      const appExt = ext(answers.language, "tsx", "jsx");
      writeIfChanged(
        rootPath(projectPath, `pages/_app.${appExt}`),
        `${isTs(answers.language) ? `import type { AppProps } from "next/app";` : ""}
import { Providers } from "../components/providers";
import "../styles/globals.css";

export default function App({ Component, pageProps }${isTs(answers.language) ? `: AppProps` : ""}) {
  return (
    <Providers>
      <Component {...pageProps} />
    </Providers>
  );
}
`
      );
      deleteIfExists(rootPath(projectPath, `pages/_app.${oppositeExt(answers.language)}`));
    }
  }

  if (answers.forms) {
    const formExt = ext(answers.language, "tsx", "jsx");
    writeIfChanged(
      componentPath(projectPath, answers, `contact-form.${formExt}`),
      contactFormContent(answers)
    );
    deleteIfExists(componentPath(projectPath, answers, `contact-form.${oppositeExt(answers.language)}`));
  }

  if (answers.toasts) {
    const toastExt = ext(answers.language, "tsx", "jsx");
    writeIfChanged(
      componentPath(projectPath, answers, `toast-demo.${toastExt}`),
      toastDemoContent()
    );
    deleteIfExists(componentPath(projectPath, answers, `toast-demo.${oppositeExt(answers.language)}`));
  }

  if (answers.i18n) {
    const i18nExt = ext(answers.language, "tsx", "jsx");
    writeIfChanged(libPath(projectPath, answers, `i18n.${i18nExt}`), i18nProviderContent(answers.language));
    deleteIfExists(libPath(projectPath, answers, `i18n.${oppositeExt(answers.language)}`));
  }

  if (answers.tests) {
    writeIfChanged(rootPath(projectPath, `vitest.config.${answers.language}`), vitestConfigContent(answers.language));
    writeIfChanged(rootPath(projectPath, path.join("test", `setup.${answers.language}`)), vitestSetupContent());
    writeIfChanged(rootPath(projectPath, path.join("test", `theme-toggle.${answers.language === "ts" ? "test.tsx" : "test.jsx"}`)), themeToggleTestContent(answers));
  }

  const featureNotes = renderPageFeatureNotes(answers);
  if (featureNotes.length > 0) {
    writeIfChanged(
      rootPath(projectPath, path.join("notes", "advanced-features.txt")),
      featureNotes.map((note) => `- ${note}`).join("\n") + "\n"
    );
  }
}
