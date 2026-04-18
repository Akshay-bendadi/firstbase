# Quicky Setup

CLI scaffold for starting a React or Next.js app with a production-oriented Tailwind baseline.

## What it does

- Creates a new project folder from an interactive prompt
- Supports `Next.js` and `React + Vite`
- Writes a Tailwind theme, starter page, and shared CSS variables
- Adds optional shadcn-ready component wiring
- Adds an optional Husky pre-commit hook
- Writes a minimal Axios client with a response interceptor
- Generates `.env.local` and `.env.example`
- Generates a production `.gitignore`
- Adds Prettier with import sorting
- Adds a GitHub Actions CI workflow
- Generates a production `.gitignore` with build, cache, log, editor, and env entries
- Offers a fast default setup or an advanced mode with React Query, SEO metadata, tests, and language support
- Advanced mode can also add auth scaffolding, validated forms, a toast system, and an i18n language switcher
- Generates a stack-aware README inside the created app so the selected tech choices are documented automatically
- Generates a Vite alias config for React so shadcn-style imports work in the browser too
- Uses animated CLI step messages

## Install

```bash
npx quicky-setup@latest
```

If you are developing this package locally:

```bash
npm install
npm run build
npm run start
```

## Usage

Run the CLI and answer the prompts:

```bash
npx quicky-setup
```

The prompts let you choose:

- Project name
- Framework: `React (Vite)` or `Next.js`
- Language: `JavaScript` or `TypeScript`
- Next.js routing: `App Router` or `Pages Router`
- UI library: `None` or `Shadcn UI`
- Husky pre-commit hook: on or off
- Advanced setup: `Skip extra setup` or `Go advanced`
- Advanced mode extras:
  - React Query
  - Auth scaffold
  - Forms stack
  - Toast system
  - Language support
  - SEO metadata for Next.js
  - Test baseline

## Generated baseline

The theme setup writes:

- `tailwind.config.js` or `tailwind.config.ts`
- `app/globals.css` for Next.js App Router
- `styles/globals.css` for Next.js Pages Router
- `src/index.css` for React + Vite
- a starter page that uses Tailwind utility classes immediately
- a floating dark/light theme toggle on the starter page

The optional shadcn setup writes:

- `components.json`
- `components/ui/button` and `components/ui/card`
- `lib/utils` or `src/lib/utils`

The optional Husky setup writes:

- `prepare` and `check` scripts in the generated `package.json`
- `.husky/pre-commit`

The API client writes:

- `lib/api.js` or `lib/api.ts` for Next.js
- `src/lib/api.js` or `src/lib/api.ts` for React + Vite
- `lib/env.js` or `lib/env.ts` for Next.js
- `src/lib/env.js` or `src/lib/env.ts` for React + Vite
- a basic response interceptor that redirects `401` responses to `/login`
- `.env.local` and `.env.example` with the API base URL variable

The formatting and CI setup writes:

- `.prettierrc.cjs`
- `.prettierignore`
- `.github/workflows/ci.yml`
- `format` and `format:check` scripts in the generated `package.json`
- `.gitignore`

The advanced setup can additionally write:

- `query-client` and `Providers` for React Query
- `auth` provider and demo auth panel
- `contact-form` scaffold built with React Hook Form and Zod
- `toast-demo` scaffold and `sonner` wiring
- `i18n` provider and language switcher
- homepage feature sections that appear based on the advanced selections
- `vitest.config.*`, `test/setup.*`, and a sample component test
- SEO metadata for Next.js App Router or Pages Router

## Notes

- The generator now writes starter content with real Tailwind classes so the build does not start from an empty content scan.
- The API client now validates the env value before creating Axios, so a missing URL fails fast with a clear error.
- Prettier is configured to sort imports consistently.
- Generated projects include a production `.gitignore` and an initial README note about the first commit being prepared.
- The CLI now animates the major scaffold steps, not just the intro banner.
- The generator keeps the fast path short and only asks advanced questions when you choose `Go advanced`.
- The advanced flow now includes auth, forms, toast, and language prompts in addition to React Query, SEO, and tests.
- The generated homepage now visibly shows the selected advanced sections.
- The generated homepage now includes an interactive showcase for auth, forms, and toasts.
- The generated app README is tailored to the selected stack, features, and layout.
- React + Vite projects now get a runtime `@` alias in `vite.config.*` plus matching shadcn alias config.
- The CLI refuses to scaffold into a non-empty folder so stale files do not leak into new runs.
- The CLI now prints a friendly error instead of a raw stack trace when setup fails.
- If you want a clean fresh generation, delete the output folder and rerun the CLI.

## Development

```bash
npm install
npm run build
```

The compiled binary is written to `dist/bin/quicky-setup.js`.
