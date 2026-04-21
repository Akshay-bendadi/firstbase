import chalk from "chalk";

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function typeLine(text: string, delay = 18): Promise<void> {
  for (const char of text) {
    process.stdout.write(char);
    await wait(delay);
  }
  process.stdout.write("\n");
}

export async function playIntroAnimation(): Promise<void> {
  const width = Math.min(process.stdout.columns || 72, 72);
  const accent = chalk.hex("#FFD166").bold;
  const cyan = chalk.hex("#4ECDC4").bold;
  const pink = chalk.hex("#FF6B6B").bold;

  console.log("\n" + cyan("┌" + "─".repeat(Math.max(width - 2, 20)) + "┐"));
  await typeLine(
    cyan("│ ") + pink("Firstbase".padEnd(Math.max(width - 16, 20))) + cyan(" │"),
    8
  );
  await typeLine(
    cyan("│ ") + accent("Fastest setup with the first commit already prepared.".padEnd(Math.max(width - 16, 20))) + cyan(" │"),
    8
  );
  console.log(cyan("└" + "─".repeat(Math.max(width - 2, 20)) + "┘"));
  console.log();
  await wait(120);
}
