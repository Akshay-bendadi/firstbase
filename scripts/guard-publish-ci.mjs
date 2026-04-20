const isDryRun = process.env.npm_config_dry_run === "true";
const isGitHubActions = process.env.GITHUB_ACTIONS === "true";
const isCi = process.env.CI === "true";

if (isDryRun) {
  process.exit(0);
}

if (!isGitHubActions || !isCi) {
  console.error("Publishing is restricted to the configured GitHub Actions release workflow.");
  console.error("Use `npm run release:dry-run` locally to inspect the package contents.");
  process.exit(1);
}
