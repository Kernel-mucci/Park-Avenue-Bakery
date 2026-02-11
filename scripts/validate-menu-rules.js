#!/usr/bin/env node
/**
 * Menu-Rules Sync Checker
 *
 * Validates that menu.html item IDs match definitions in api/order-rules.js
 * Run: node scripts/validate-menu-rules.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');

// ANSI colors for terminal output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(color, symbol, message) {
  console.log(`${colors[color]}${symbol}${colors.reset} ${message}`);
}

// Extract item IDs from menu.html
function getMenuItemIds() {
  const menuPath = path.join(ROOT, 'menu.html');
  const content = fs.readFileSync(menuPath, 'utf-8');

  // Match data-id="..." in add-to-cart buttons
  const regex = /data-id="([^"]+)"/g;
  const ids = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    ids.push(match[1]);
  }

  return [...new Set(ids)]; // Remove duplicates
}

// Extract item IDs from order-rules.js
function getRulesItemIds() {
  const rulesPath = path.join(ROOT, 'api', 'order-rules.js');
  const content = fs.readFileSync(rulesPath, 'utf-8');

  const ids = [];

  // Match object keys in the various item objects
  // Pattern: 'item-id': { or "item-id": {
  const regex = /['"]([a-z]+-\d+|[a-z]+-[a-z-]+)['"]:\s*\{/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    // Filter out non-item keys (like 'weekday', 'saturday', etc.)
    const id = match[1];
    if (id.match(/^(bread|bar|cookie|pastry|cake|sandwich|drink|breakfast|dessert|test)-/)) {
      ids.push(id);
    }
  }

  return [...new Set(ids)];
}

// Main validation
function validate() {
  console.log(`\n${colors.bold}Menu-Rules Sync Checker${colors.reset}\n`);
  console.log('Checking that menu items have corresponding rules definitions...\n');

  let hasErrors = false;
  let hasWarnings = false;

  try {
    const menuIds = getMenuItemIds();
    const rulesIds = getRulesItemIds();

    console.log(`Found ${colors.blue}${menuIds.length}${colors.reset} items in menu.html`);
    console.log(`Found ${colors.blue}${rulesIds.length}${colors.reset} items in order-rules.js\n`);

    // Check for menu items missing from rules
    const missingFromRules = menuIds.filter(id => !rulesIds.includes(id));

    if (missingFromRules.length > 0) {
      hasErrors = true;
      log('red', '✗', `${missingFromRules.length} menu items missing from order-rules.js:`);
      missingFromRules.forEach(id => {
        console.log(`    - ${id}`);
      });
      console.log('');
    }

    // Check for rules items not in menu (might be intentional - test items, etc.)
    const missingFromMenu = rulesIds.filter(id => !menuIds.includes(id));

    if (missingFromMenu.length > 0) {
      hasWarnings = true;
      log('yellow', '!', `${missingFromMenu.length} rule items not in menu.html (may be intentional):`);
      missingFromMenu.forEach(id => {
        console.log(`    - ${id}`);
      });
      console.log('');
    }

    // Check for duplicate IDs in menu
    const menuPath = path.join(ROOT, 'menu.html');
    const menuContent = fs.readFileSync(menuPath, 'utf-8');
    const allMatches = menuContent.match(/data-id="([^"]+)"/g) || [];
    const idCounts = {};

    allMatches.forEach(match => {
      const id = match.match(/data-id="([^"]+)"/)[1];
      idCounts[id] = (idCounts[id] || 0) + 1;
    });

    const duplicates = Object.entries(idCounts).filter(([id, count]) => count > 1);

    if (duplicates.length > 0) {
      hasErrors = true;
      log('red', '✗', `Duplicate item IDs found in menu.html:`);
      duplicates.forEach(([id, count]) => {
        console.log(`    - ${id} (appears ${count} times)`);
      });
      console.log('');
    }

    // Summary
    if (!hasErrors && !hasWarnings) {
      log('green', '✓', 'All menu items have corresponding rules definitions!');
    } else if (!hasErrors) {
      log('green', '✓', 'All menu items have rules (warnings are informational only)');
    }

    // Category breakdown
    console.log(`\n${colors.bold}Category Breakdown:${colors.reset}`);
    const categories = {
      breads: menuIds.filter(id => id.startsWith('bread-')).length,
      bars: menuIds.filter(id => id.startsWith('bar-')).length,
      cookies: menuIds.filter(id => id.startsWith('cookie-')).length,
      pastries: menuIds.filter(id => id.startsWith('pastry-')).length,
      other: menuIds.filter(id => !id.match(/^(bread|bar|cookie|pastry)-/)).length
    };

    Object.entries(categories).forEach(([cat, count]) => {
      if (count > 0) {
        console.log(`  ${cat}: ${count}`);
      }
    });

    console.log('');

    return hasErrors ? 1 : 0;

  } catch (error) {
    log('red', '✗', `Error: ${error.message}`);
    return 1;
  }
}

process.exit(validate());
