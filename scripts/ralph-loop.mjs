import { execSync } from 'child_process';
import { logExecution } from './ledger.mjs';

// Execution context to pass to the ledger at the end
const executionContext = {
  phase: 'Orchestration Loop',
  executorModel: 'Automated Runner', // We can dynamically inject the model name if driven by an AI agent
  commandsRun: [],
  exitCode: 0,
  filesChanged: []
};

/**
 * State: readScope
 */
async function readScope() {
  console.log("[Transition] -> Entering state: readScope");
  
  // 1. Run Pre-flight check
  console.log("Running pre-flight check...");
  executionContext.commandsRun.push('node scripts/pre-flight.mjs');
  try {
    execSync('node scripts/pre-flight.mjs', { stdio: 'inherit' });
  } catch (error) {
    throw new Error(`Pre-flight script failed or blocked execution.`);
  }

  console.log("[Transition] <- Exiting state: readScope");
}

/**
 * State: analyzeMetrics
 */
async function analyzeMetrics() {
  console.log("[Transition] -> Entering state: analyzeMetrics");
  // TODO: Add analyzeMetrics logic here
  console.log("[Transition] <- Exiting state: analyzeMetrics");
}

/**
 * State: launchExecution
 */
async function launchExecution() {
  console.log("[Transition] -> Entering state: launchExecution");
  // TODO: Add launchExecution logic here
  console.log("[Transition] <- Exiting state: launchExecution");
}

/**
 * State: proveValidation
 */
async function proveValidation() {
  console.log("[Transition] -> Entering state: proveValidation");
  
  console.log("Running validation command (e.g., npm test)...");
  executionContext.commandsRun.push('npm test');
  try {
    execSync('npm test', { stdio: 'inherit' });
  } catch (error) {
    throw new Error(`proveValidation failed during test execution: ${error.message}`);
  }

  console.log("[Transition] <- Exiting state: proveValidation");
}

/**
 * State: handoffState
 */
async function handoffState() {
  console.log("[Transition] -> Entering state: handoffState");
  // TODO: Add handoffState logic here
  console.log("[Transition] <- Exiting state: handoffState");
}

/**
 * Orchestrator loop
 */
async function main() {
  console.log("=== Starting Ralph Loop ===");
  try {
    await readScope();
    await analyzeMetrics();
    await launchExecution();
    await proveValidation();
    await handoffState();
    console.log("=== Ralph Loop Completed Successfully ===");
  } catch (error) {
    console.error(`\n[FATAL ERROR] State machine halted. Reason: ${error.message}`);
    executionContext.exitCode = 1;
  } finally {
    // End of AI Operation - Log to Ledger
    console.log("\n[Teardown] Running Ledger update...");
    logExecution(executionContext);
    
    if (executionContext.exitCode !== 0) {
      process.exit(executionContext.exitCode);
    }
  }
}

// Execute the state machine
main();
