import { askQuestions } from './prompts.js';
import { playIntroAnimation } from './cliAnimation.js';
import { scaffoldProject } from './scaffolder.js';

export async function main(): Promise<void> {
  try {
    await playIntroAnimation();
    const answers = await askQuestions();
    await scaffoldProject(answers);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`\n✗ ${message}`);
    process.exitCode = 1;
  }
}
