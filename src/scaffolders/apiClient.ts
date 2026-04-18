import fs from "fs";
import path from "path";
import type { Framework } from "../prompts.js";

type Language = "js" | "ts";

function ensureDir(filePath: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeFile(filePath: string, content: string): void {
  ensureDir(filePath);
  fs.writeFileSync(filePath, content);
  console.log(`♻️  Wrote: ${path.relative(process.cwd(), filePath)}`);
}

function envFileContent(framework: Framework): string {
  const envVar = framework === "next" ? "NEXT_PUBLIC_API_URL" : "VITE_API_URL";
  return `# Update this value to point at your API backend.
${envVar}=http://localhost:3000/api
`;
}

function envExampleContent(framework: Framework): string {
  const envVar = framework === "next" ? "NEXT_PUBLIC_API_URL" : "VITE_API_URL";
  return `# Copy this file to .env.local and set your API URL.
${envVar}=http://localhost:3000/api
`;
}

function clientPath(projectPath: string, framework: Framework, language: Language): string {
  const fileName = `api.${language}`;
  return framework === "next"
    ? path.join(projectPath, "lib", fileName)
    : path.join(projectPath, "src", "lib", fileName);
}

function envPath(projectPath: string, framework: Framework, language: Language): string {
  const fileName = `env.${language}`;
  return framework === "next"
    ? path.join(projectPath, "lib", fileName)
    : path.join(projectPath, "src", "lib", fileName);
}

function envHelperContent(language: Language, framework: Framework): string {
  const envVar = framework === "next" ? "NEXT_PUBLIC_API_URL" : "VITE_API_URL";
  const envAccessor = framework === "next" ? `process.env.${envVar}` : `import.meta.env.${envVar}`;

  if (language === "ts") {
    return `const envVarName = "${envVar}";

function requireEnv(value: string | undefined): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(\`Missing \${envVarName}. Set it in your .env.local file.\`);
  }

  return value.trim();
}

export function getApiBaseUrl(): string {
  return requireEnv(${envAccessor});
}
`;
  }

  return `const envVarName = "${envVar}";

function requireEnv(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(\`Missing \${envVarName}. Set it in your .env.local file.\`);
  }

  return value.trim();
}

export function getApiBaseUrl() {
  return requireEnv(${envAccessor});
}
`;
}

function apiClientContent(language: Language, framework: Framework): string {
  const importLine = language === "ts"
    ? `import axios, { AxiosError } from "axios";
import { getApiBaseUrl } from "./env";`
    : `import axios from "axios";`;
  const typeBlock = language === "ts"
    ? `
type ApiError = {
  message: string;
  status?: number;
  data?: unknown;
};
`
    : `
`;

  return `${importLine}

const baseURL = getApiBaseUrl();

${typeBlock}const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error${language === "ts" ? ": AxiosError" : ""}) => {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401 && typeof window !== "undefined") {
        window.location.href = "/login";
      }

      return Promise.reject({
        message: error.response?.data?.message || error.message || "Request failed",
        status: error.response?.status,
        data: error.response?.data,
      }${language === "ts" ? ` satisfies ApiError` : ""});
    }

    return Promise.reject({
      message: "Unexpected network error",
    }${language === "ts" ? ` satisfies ApiError` : ""});
  }
);

${language === "ts" ? "export type { ApiError };\n" : ""}export default api;
`;
}

export function scaffoldApiClient(
  projectPath: string,
  language: Language,
  framework: Framework
): void {
  writeFile(envPath(projectPath, framework, language), envHelperContent(language, framework));
  writeFile(clientPath(projectPath, framework, language), apiClientContent(language, framework));
  writeFile(path.join(projectPath, ".env.local"), envFileContent(framework));
  writeFile(path.join(projectPath, ".env.example"), envExampleContent(framework));
}
