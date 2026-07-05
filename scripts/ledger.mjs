import fs from 'fs';
import path from 'path';

const LEDGER_JSON_PATH = path.resolve('.agent/state/ledger.json');
const AUDIT_MD_PATH = path.resolve('docs/audit-ledger.md');

/**
 * Logs the execution state to both JSON and Markdown ledgers.
 * 
 * @param {Object} executionData 
 * @param {string} executionData.phase
 * @param {string} executionData.executorModel
 * @param {string[]} executionData.commandsRun
 * @param {number} executionData.exitCode
 * @param {string[]} executionData.filesChanged
 */
export function logExecution(executionData) {
  const timestamp = new Date().toISOString();
  const record = { timestamp, ...executionData };
  
  // 1. Append to JSON
  fs.mkdirSync(path.dirname(LEDGER_JSON_PATH), { recursive: true });
  let ledger = [];
  if (fs.existsSync(LEDGER_JSON_PATH)) {
    try {
      ledger = JSON.parse(fs.readFileSync(LEDGER_JSON_PATH, 'utf-8'));
    } catch (e) {
      console.warn("Could not parse existing ledger.json, starting fresh.");
    }
  }
  
  ledger.push(record);
  fs.writeFileSync(LEDGER_JSON_PATH, JSON.stringify(ledger, null, 2));

  // 2. Append to Markdown table
  fs.mkdirSync(path.dirname(AUDIT_MD_PATH), { recursive: true });
  const isNewFile = !fs.existsSync(AUDIT_MD_PATH);
  
  const cmds = record.commandsRun.length ? `\`${record.commandsRun.join('`, `')}\`` : 'None';
  const files = record.filesChanged.length ? record.filesChanged.join(', ') : 'None';
  
  let mdRow = `| ${record.timestamp} | ${record.phase} | ${record.executorModel} | ${cmds} | ${record.exitCode} | ${files} |\n`;
  
  if (isNewFile) {
    const mdHeader = `# Execution Audit Ledger\n\n| Timestamp | Phase | Executor Model | Commands Run | Exit Code | Files Changed |\n|---|---|---|---|---|---|\n`;
    fs.writeFileSync(AUDIT_MD_PATH, mdHeader + mdRow);
  } else {
    fs.appendFileSync(AUDIT_MD_PATH, mdRow);
  }
  
  console.log(`[Ledger] Logged execution for phase '${record.phase}' (Exit Code: ${record.exitCode})`);
}
