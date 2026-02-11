#!/usr/bin/env node
/**
 * Validate All - Master Runner
 *
 * Runs all validation scripts in sequence:
 * 1. Menu-Rules Sync
 * 2. Checklist Templates
 * 3. Price Consistency
 * 4. Security Scan
 *
 * Run: node scripts/validate-all.js
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCRIPTS_DIR = __dirname;

// ANSI colors
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const validators = [
  { name: 'Menu-Rules Sync', script: 'validate-menu-rules.js' },
  { name: 'Checklist Templates', script: 'validate-checklists.js' },
  { name: 'Price Consistency', script: 'validate-prices.js' },
  { name: 'Security Scan', script: 'security-scan.js' },
];

console.log(`
${colors.bold}╔═══════════════════════════════════════════════════════════════╗
║           Park Avenue Bakery - Validation Suite               ║
╚═══════════════════════════════════════════════════════════════╝${colors.reset}
`);

let totalErrors = 0;
const results = [];

validators.forEach((validator, idx) => {
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bold}[${idx + 1}/${validators.length}] Running: ${validator.name}${colors.reset}`);
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);

  try {
    execSync(`node ${path.join(SCRIPTS_DIR, validator.script)}`, {
      stdio: 'inherit',
      cwd: path.join(SCRIPTS_DIR, '..')
    });
    results.push({ name: validator.name, status: 'pass' });
  } catch (error) {
    totalErrors++;
    results.push({ name: validator.name, status: 'fail' });
  }
});

// Final Summary
console.log(`
${colors.bold}╔═══════════════════════════════════════════════════════════════╗
║                      Validation Summary                        ║
╚═══════════════════════════════════════════════════════════════╝${colors.reset}
`);

results.forEach(r => {
  const icon = r.status === 'pass' ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
  const statusColor = r.status === 'pass' ? colors.green : colors.red;
  console.log(`  ${icon} ${r.name}: ${statusColor}${r.status.toUpperCase()}${colors.reset}`);
});

console.log('');

if (totalErrors === 0) {
  console.log(`${colors.green}${colors.bold}All validations passed!${colors.reset}`);
  console.log(`${colors.cyan}Safe to deploy.${colors.reset}`);
} else {
  console.log(`${colors.red}${colors.bold}${totalErrors} validation(s) failed.${colors.reset}`);
  console.log(`${colors.yellow}Review issues above before deploying.${colors.reset}`);
}

console.log('');

process.exit(totalErrors > 0 ? 1 : 0);
