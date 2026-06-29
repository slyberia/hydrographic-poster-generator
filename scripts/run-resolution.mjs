/**
 * run-resolution.mjs
 *
 * Central pipeline orchestration script for the Governance First protocol.
 *
 * Usage:
 *   node scripts/run-resolution.mjs "<Architect Ruling or Subphase Identifier>"
 *
 * This script:
 *   1. Asserts git-synchronicity (pre-flight check).
 *   2. Accepts an Architect Ruling as a CLI argument.
 *   3. Reads the governance prompt and project context.
 *   4. Assembles a combined prompt for the implementation executor.
 *   5. Invokes the executor and parses mutations.
 *   6. Runs formatting and validation.
 *   7. Stages, commits, and logs to the command ledger.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { logToLedger } from './utils/ledger.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Pre-Flight: Git Synchronicity Check
// ---------------------------------------------------------------------------

/**
 * Asserts that the current branch is synchronized with its upstream.
 * This is a HARD constraint — no mutations are allowed on unsynchronized branches.
 *
 * States:
 *   - Behind upstream → hard error, process.exit(1).
 *   - Ahead of upstream → warning, proceed with caution.
 *   - No upstream configured → warning, proceed with caution.
 */
function assertSynchronizedBranch() {
  console.log('🔄 Pre-flight: Checking git synchronicity...');

  try {
    // Fetch latest from origin (suppress noisy output)
    execSync('git fetch origin', { stdio: 'pipe', cwd: PROJECT_ROOT });
  } catch {
    console.warn('⚠️ Pre-flight warning: Could not fetch from origin. Proceeding with caution.');
    return;
  }

  // Detect current branch
  let branch;
  try {
    branch = execSync('git branch --show-current', { stdio: 'pipe', cwd: PROJECT_ROOT })
      .toString()
      .trim();
  } catch {
    console.warn('⚠️ Pre-flight warning: Could not determine current branch. Proceeding with caution.');
    return;
  }

  if (!branch) {
    console.warn('⚠️ Pre-flight warning: Detached HEAD state. Proceeding with caution.');
    return;
  }

  // Check for upstream tracking branch
  let upstream;
  try {
    upstream = execSync(`git rev-parse --abbrev-ref ${branch}@{u}`, { stdio: 'pipe', cwd: PROJECT_ROOT })
      .toString()
      .trim();
  } catch {
    console.warn(`⚠️ Pre-flight warning: No upstream configured for branch '${branch}'. Proceeding with caution.`);
    return;
  }

  // Compare ahead/behind counts using three-dot syntax for left-right comparison
  let ahead = 0;
  let behind = 0;
  try {
    const output = execSync(`git rev-list --left-right --count HEAD...${upstream}`, {
      stdio: 'pipe',
      cwd: PROJECT_ROOT,
    })
      .toString()
      .trim();

    const parts = output.split('\t');
    ahead = parseInt(parts[0], 10) || 0;
    behind = parseInt(parts[1], 10) || 0;
  } catch {
    console.warn('⚠️ Pre-flight warning: Could not determine ahead/behind counts. Proceeding with caution.');
    return;
  }

  if (behind > 0) {
    console.error(`❌ Pre-flight FAILED: Branch '${branch}' is ${behind} commit(s) behind '${upstream}'.`);
    console.error('   Pull upstream changes before running the pipeline. No mutations allowed.');
    process.exit(1);
  }

  if (ahead > 0) {
    console.warn(`⚠️ Pre-flight warning: Branch '${branch}' is ${ahead} commit(s) ahead of '${upstream}'. Proceeding with caution.`);
  } else {
    console.log(`✅ Pre-flight passed: Branch '${branch}' is synchronized with '${upstream}'.`);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Runs a shell command, captures output, and returns structured result.
 */
function runCommand(cmd) {
  console.log(`▶ Running: ${cmd}`);
  try {
    const output = execSync(cmd, { stdio: 'pipe', cwd: PROJECT_ROOT }).toString().trim();
    console.log(output || '(no output)');
    return { cmd, exitCode: 0, summary: 'Success' };
  } catch (err) {
    const exitCode = err.status || 1;
    const stderr = err.stderr ? err.stderr.toString().trim() : err.message;
    console.error(`⚠️ Command failed (exit ${exitCode}): ${stderr}`);
    return { cmd, exitCode, summary: stderr.substring(0, 200) };
  }
}

/**
 * Parses <File path="...">...</File> tags from executor output.
 * Returns an array of { path, content } objects.
 */
function parseFileTags(output) {
  const regex = /<File\s+path="([^"]+)">([\s\S]*?)<\/File>/g;
  const files = [];
  let match;
  while ((match = regex.exec(output)) !== null) {
    files.push({ path: match[1], content: match[2] });
  }
  return files;
}

/**
 * Parses the <Next_Step>...</Next_Step> tag from executor output.
 */
function parseNextStep(output) {
  const match = output.match(/<Next_Step>([\s\S]*?)<\/Next_Step>/);
  return match ? match[1].trim() : null;
}

// ---------------------------------------------------------------------------
// Main Pipeline
// ---------------------------------------------------------------------------

try {
  // Step 1: Pre-flight
  assertSynchronizedBranch();

  // Step 2: Accept Architect Ruling from CLI
  const ruling = process.argv[2];
  if (!ruling) {
    throw new Error(
      'Missing Architect Ruling. Usage: node scripts/run-resolution.mjs "<ruling>"'
    );
  }
  console.log(`\n📋 Architect Ruling: ${ruling}\n`);

  // Step 3: Read governance prompt and context
  const governancePromptPath = path.join(PROJECT_ROOT, '.agent', 'prompts', 'resolution-coach.md');
  const contextPath = path.join(PROJECT_ROOT, 'docs', 'MVP_FUNCTIONAL_SPEC.md');

  let governancePrompt = '';
  if (fs.existsSync(governancePromptPath)) {
    governancePrompt = fs.readFileSync(governancePromptPath, 'utf8');
  } else {
    console.warn(`⚠️ Governance prompt not found at ${governancePromptPath}. Proceeding without it.`);
  }

  let contextDoc = '';
  if (fs.existsSync(contextPath)) {
    contextDoc = fs.readFileSync(contextPath, 'utf8');
  }

  // Step 4: Assemble combined prompt
  const combinedPrompt = [
    '# Resolution Prompt',
    '',
    '## Architect Ruling',
    ruling,
    '',
    '## Governance Contract',
    governancePrompt,
    '',
    '## Project Context',
    contextDoc,
  ].join('\n');

  const tempPromptPath = path.join(PROJECT_ROOT, '.agent', 'prompts', 'temp-resolution-prompt.md');
  const tempDir = path.dirname(tempPromptPath);
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  fs.writeFileSync(tempPromptPath, combinedPrompt);
  console.log(`📝 Combined prompt written to ${tempPromptPath}`);

  // Step 5: Invoke implementation executor
  // TODO: Replace this with your actual executor invocation.
  // Examples:
  //   - codex exec --prompt-file <path>
  //   - claude --prompt-file <path>
  //   - Custom API call
  //
  // For now, this reads the prompt and expects manual executor invocation.
  console.log('\n🔧 Executor invocation placeholder:');
  console.log('   The combined prompt has been written to:');
  console.log(`   ${tempPromptPath}`);
  console.log('   Pass this prompt to your implementation executor.\n');

  // Placeholder: In a fully automated setup, you would capture executor output here.
  // const executorOutput = execSync(`codex exec --prompt-file "${tempPromptPath}"`, ...).toString();
  let executorOutput = '';

  // Step 6: Parse mutations from executor output (if any)
  const mutations = [];
  const parsedFiles = parseFileTags(executorOutput);
  for (const file of parsedFiles) {
    const filePath = path.resolve(PROJECT_ROOT, file.path);
    const fileDir = path.dirname(filePath);
    if (!fs.existsSync(fileDir)) {
      fs.mkdirSync(fileDir, { recursive: true });
    }
    fs.writeFileSync(filePath, file.content);
    mutations.push(file.path);
    console.log(`📁 Wrote: ${file.path}`);
  }

  // Step 7: Clean up temp prompt
  if (fs.existsSync(tempPromptPath)) {
    fs.unlinkSync(tempPromptPath);
    console.log('🧹 Cleaned up temporary prompt file.');
  }

  // Step 8: Run formatter
  // TODO: Uncomment when npm scripts are configured
  // const formatResult = runCommand('npm run fix:format');
  const formatResult = { cmd: 'npm run fix:format', exitCode: 0, summary: 'Skipped (not yet configured)' };
  console.log('⏭️  Formatting skipped (npm run fix:format not yet configured).');

  // Step 9: Run validation suite
  // TODO: Uncomment when npm scripts are configured
  // const validateResult = runCommand('npm run validate:phase');
  const validateResult = { cmd: 'npm run validate:phase', exitCode: 0, summary: 'Skipped (not yet configured)' };
  console.log('⏭️  Validation skipped (npm run validate:phase not yet configured).');

  // Step 10: Stage and commit (only if there are mutations)
  const commands = [formatResult, validateResult];
  if (mutations.length > 0) {
    const addResult = runCommand('git add .');
    commands.push(addResult);

    const commitMsg = `chore(governance): resolution for ${ruling.substring(0, 50)}`;
    const commitResult = runCommand(`git commit -m "${commitMsg}"`);
    commands.push(commitResult);
  } else {
    console.log('ℹ️  No mutations detected. Skipping git stage/commit.');
  }

  // Step 11: Log to ledger
  logToLedger({
    phase: '1.0',
    subphase: 'Resolution',
    executor: 'run-resolution.mjs',
    commands,
    mutations,
    commandsAvailable: ['npm run fix:format', 'npm run validate:phase', 'git add .', 'git commit'],
    commandsUsed: commands.map((c) => c.cmd),
    recommendedNextCommands: [],
    recommendedExecutor: 'The Specialist',
    fallbackExecutor: 'Assistant Coach',
    mode: 'resolution',
    status: commands.every((c) => c.exitCode === 0) ? 'pass' : 'fail',
    notes: `Ruling: ${ruling}`,
  });

  // Step 12: Parse and display next step (if present in executor output)
  const nextStep = parseNextStep(executorOutput);
  if (nextStep) {
    console.log(`\n🔜 Next Step:\n${nextStep}\n`);
  }

  console.log('\n✅ Resolution pipeline complete.');
} catch (err) {
  console.error(`\n❌ Pipeline error: ${err.message}`);
  logToLedger({
    phase: '1.0',
    subphase: 'Resolution',
    executor: 'run-resolution.mjs',
    commands: [{ cmd: 'pipeline', exitCode: 1, summary: err.message }],
    mutations: [],
    commandsAvailable: [],
    commandsUsed: [],
    recommendedNextCommands: [],
    recommendedExecutor: 'The Specialist',
    fallbackExecutor: 'Assistant Coach',
    mode: 'resolution',
    status: 'fail',
    notes: `Error: ${err.message}`,
  });
  process.exit(1);
}
