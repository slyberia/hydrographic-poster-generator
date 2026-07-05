import { execSync } from 'child_process';

console.log("=== Pre-flight Check ===");
try {
  console.log("Fetching origin...");
  // stdio inherit to see git output directly
  execSync('git fetch origin', { stdio: 'inherit' });
  
  // Calculate how many commits local is behind upstream
  const revListOutput = execSync('git rev-list --left-right --count HEAD...@{u}').toString().trim();
  const behindCount = parseInt(revListOutput.split('\t')[1], 10);
  
  if (behindCount > 0) {
    console.error(`\n[CRITICAL ERROR] Local branch is behind upstream by ${behindCount} commits.`);
    console.error("The Orchestrator AI must run this script successfully before touching any code.");
    process.exit(1);
  } else {
    console.log("Pre-flight check passed. Branch is up-to-date with origin.");
  }
} catch (error) {
  // Check if error is because there is no upstream branch configured
  if (error.message.includes('No upstream configured') || error.message.includes('no upstream')) {
    console.warn("\n[WARNING] No upstream tracking branch configured. Skipping behind-count check. Ensure you push your branch soon.");
  } else {
    console.error(`\n[CRITICAL ERROR] Pre-flight failed: ${error.message}`);
    process.exit(1);
  }
}
