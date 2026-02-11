#!/usr/bin/env node
/**
 * Checklist Template Validator
 *
 * Validates that checklist templates are consistent across:
 * - api/prep-dashboard/checklists/index.js (summary with itemCount)
 * - api/prep-dashboard/checklists/[...path].js (full templates)
 *
 * Run: node scripts/validate-checklists.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');

// ANSI colors
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

// Parse checklist templates from index.js (summary format)
function getIndexTemplates() {
  const indexPath = path.join(ROOT, 'api', 'prep-dashboard', 'checklists', 'index.js');
  const content = fs.readFileSync(indexPath, 'utf-8');

  const templates = {};

  // Match template entries like: 'baker-opening': { id: '...', name: '...', scheduledTime: '...', itemCount: N }
  const regex = /'([^']+)':\s*\{\s*id:\s*'([^']+)',\s*name:\s*'([^']+)',\s*scheduledTime:\s*'([^']+)',\s*itemCount:\s*(\d+)/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    templates[match[1]] = {
      id: match[2],
      name: match[3],
      scheduledTime: match[4],
      itemCount: parseInt(match[5], 10)
    };
  }

  return templates;
}

// Parse checklist templates from [...path].js (full format)
function getPathTemplates() {
  const pathFile = path.join(ROOT, 'api', 'prep-dashboard', 'checklists', '[...path].js');
  const content = fs.readFileSync(pathFile, 'utf-8');

  const templates = {};

  // Find the CHECKLIST_TEMPLATES object
  const templatesMatch = content.match(/const CHECKLIST_TEMPLATES\s*=\s*\{([\s\S]*?)\n\};/);
  if (!templatesMatch) {
    throw new Error('Could not find CHECKLIST_TEMPLATES in [...path].js');
  }

  // Extract template IDs and count items in each
  const templateRegex = /'([^']+)':\s*\{\s*id:\s*'([^']+)',\s*name:\s*'([^']+)',\s*scheduledTime:\s*'([^']+)',\s*sections:/g;
  let match;

  while ((match = templateRegex.exec(content)) !== null) {
    const templateId = match[1];
    const templateName = match[3];
    const scheduledTime = match[4];

    // Find this template's sections and count items
    const templateStart = match.index;
    let braceCount = 0;
    let templateEnd = templateStart;
    let foundStart = false;

    for (let i = templateStart; i < content.length; i++) {
      if (content[i] === '{') {
        braceCount++;
        foundStart = true;
      } else if (content[i] === '}') {
        braceCount--;
        if (foundStart && braceCount === 0) {
          templateEnd = i;
          break;
        }
      }
    }

    const templateContent = content.slice(templateStart, templateEnd + 1);

    // Count items by counting { id: patterns within items arrays
    const itemMatches = templateContent.match(/\{\s*id:\s*'/g) || [];
    const itemCount = itemMatches.length;

    templates[templateId] = {
      id: templateId,
      name: templateName,
      scheduledTime: scheduledTime,
      itemCount: itemCount
    };
  }

  return templates;
}

// Validate item IDs are unique within a template
function checkDuplicateItemIds() {
  const pathFile = path.join(ROOT, 'api', 'prep-dashboard', 'checklists', '[...path].js');
  const content = fs.readFileSync(pathFile, 'utf-8');

  const issues = [];

  // Find each template and check for duplicate item IDs
  const templateRegex = /'([^']+)':\s*\{[\s\S]*?sections:\s*\[([\s\S]*?)\]\s*\}/g;
  let match;

  // Simple approach: find all item IDs in the file and check for duplicates
  const itemIdRegex = /\{\s*id:\s*'([^']+)'/g;
  const allIds = [];
  let idMatch;

  while ((idMatch = itemIdRegex.exec(content)) !== null) {
    allIds.push(idMatch[1]);
  }

  // Check for duplicates
  const idCounts = {};
  allIds.forEach(id => {
    idCounts[id] = (idCounts[id] || 0) + 1;
  });

  const duplicates = Object.entries(idCounts).filter(([id, count]) => count > 1);

  return duplicates;
}

// Main validation
function validate() {
  console.log(`\n${colors.bold}Checklist Template Validator${colors.reset}\n`);
  console.log('Checking consistency between index.js and [...path].js...\n');

  let hasErrors = false;
  let hasWarnings = false;

  try {
    const indexTemplates = getIndexTemplates();
    const pathTemplates = getPathTemplates();

    const indexIds = Object.keys(indexTemplates);
    const pathIds = Object.keys(pathTemplates);

    console.log(`Found ${colors.blue}${indexIds.length}${colors.reset} templates in index.js`);
    console.log(`Found ${colors.blue}${pathIds.length}${colors.reset} templates in [...path].js\n`);

    // Check for templates in index but not in path
    const missingFromPath = indexIds.filter(id => !pathIds.includes(id));
    if (missingFromPath.length > 0) {
      hasErrors = true;
      log('red', '✗', `Templates in index.js but missing from [...path].js:`);
      missingFromPath.forEach(id => console.log(`    - ${id}`));
      console.log('');
    }

    // Check for templates in path but not in index
    const missingFromIndex = pathIds.filter(id => !indexIds.includes(id));
    if (missingFromIndex.length > 0) {
      hasErrors = true;
      log('red', '✗', `Templates in [...path].js but missing from index.js:`);
      missingFromIndex.forEach(id => console.log(`    - ${id}`));
      console.log('');
    }

    // Check item counts match
    const countMismatches = [];
    indexIds.forEach(id => {
      if (pathTemplates[id]) {
        const indexCount = indexTemplates[id].itemCount;
        const pathCount = pathTemplates[id].itemCount;
        if (indexCount !== pathCount) {
          countMismatches.push({
            id,
            indexCount,
            pathCount
          });
        }
      }
    });

    if (countMismatches.length > 0) {
      hasErrors = true;
      log('red', '✗', `Item count mismatches:`);
      countMismatches.forEach(({ id, indexCount, pathCount }) => {
        console.log(`    - ${id}: index.js says ${indexCount}, [...path].js has ${pathCount}`);
      });
      console.log('');
    }

    // Check for duplicate item IDs
    const duplicates = checkDuplicateItemIds();
    if (duplicates.length > 0) {
      hasWarnings = true;
      log('yellow', '!', `Duplicate item IDs found (may be intentional across templates):`);
      duplicates.forEach(([id, count]) => {
        console.log(`    - '${id}' appears ${count} times`);
      });
      console.log('');
    }

    // Check scheduled times match
    const timeMismatches = [];
    indexIds.forEach(id => {
      if (pathTemplates[id]) {
        const indexTime = indexTemplates[id].scheduledTime;
        const pathTime = pathTemplates[id].scheduledTime;
        if (indexTime !== pathTime) {
          timeMismatches.push({ id, indexTime, pathTime });
        }
      }
    });

    if (timeMismatches.length > 0) {
      hasErrors = true;
      log('red', '✗', `Scheduled time mismatches:`);
      timeMismatches.forEach(({ id, indexTime, pathTime }) => {
        console.log(`    - ${id}: index.js says ${indexTime}, [...path].js says ${pathTime}`);
      });
      console.log('');
    }

    // Summary table
    console.log(`${colors.bold}Template Summary:${colors.reset}`);
    console.log('┌─────────────────────┬───────────┬─────────────┬─────────────┐');
    console.log('│ Template            │ Time      │ Index Count │ Path Count  │');
    console.log('├─────────────────────┼───────────┼─────────────┼─────────────┤');

    pathIds.forEach(id => {
      const indexData = indexTemplates[id] || { itemCount: '?' };
      const pathData = pathTemplates[id];
      const name = (pathData.name || id).padEnd(19).slice(0, 19);
      const time = (pathData.scheduledTime || '?').padEnd(9);
      const iCount = String(indexData.itemCount).padStart(11);
      const pCount = String(pathData.itemCount).padStart(11);
      const match = indexData.itemCount === pathData.itemCount ? '' : ' ⚠';

      console.log(`│ ${name} │ ${time} │ ${iCount} │ ${pCount}${match} │`);
    });

    console.log('└─────────────────────┴───────────┴─────────────┴─────────────┘');
    console.log('');

    // Final status
    if (!hasErrors && !hasWarnings) {
      log('green', '✓', 'All checklist templates are consistent!');
    } else if (!hasErrors) {
      log('green', '✓', 'Templates are consistent (warnings are informational)');
    } else {
      log('red', '✗', 'Template inconsistencies found - please fix before deploying');
    }

    console.log('');
    return hasErrors ? 1 : 0;

  } catch (error) {
    log('red', '✗', `Error: ${error.message}`);
    return 1;
  }
}

process.exit(validate());
