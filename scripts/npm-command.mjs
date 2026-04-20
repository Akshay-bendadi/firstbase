import { spawnSync } from "node:child_process";

const npmExecPath = process.env.npm_execpath;
const args = process.argv.slice(2);

if (!npmExecPath) {
  console.error("npm_execpath is missing. Run this command through npm.");
  process.exit(1);
}

if (args.length === 0) {
  console.error("No npm command was provided.");
  process.exit(1);
}

const result = spawnSync(process.execPath, [npmExecPath, ...args], {
  stdio: "inherit",
  env: process.env,
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

if (result.signal) {
  console.error(`npm command was terminated by ${result.signal}.`);
  process.exit(1);
}

process.exit(result.status ?? 1);
