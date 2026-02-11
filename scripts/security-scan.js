#!/usr/bin/env node
/**
 * Security Scanner
 *
 * Checks for common security issues:
 * - Hardcoded secrets/credentials
 * - Missing auth checks in API endpoints
 * - Potential XSS vulnerabilities
 * - Exposed sensitive data in frontend code
 *
 * Run: node scripts/security-scan.js
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
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(color, symbol, message) {
  console.log(`${colors[color]}${symbol}${colors.reset} ${message}`);
}

// Patterns that might indicate hardcoded secrets
const SECRET_PATTERNS = [
  { pattern: /['"]sk_live_[a-zA-Z0-9]+['"]/, name: 'Stripe live key' },
  { pattern: /['"]sk_test_[a-zA-Z0-9]+['"]/, name: 'Stripe test key' },
  { pattern: /['"]pk_live_[a-zA-Z0-9]+['"]/, name: 'Stripe publishable key' },
  { pattern: /['"][a-f0-9]{32}['"]/, name: 'Potential API key (32 hex chars)' },
  { pattern: /password\s*[:=]\s*['"][^'"]{8,}['"](?!.*process\.env)/i, name: 'Hardcoded password' },
  { pattern: /api[_-]?key\s*[:=]\s*['"][^'"]+['"](?!.*process\.env)/i, name: 'Hardcoded API key' },
  { pattern: /secret\s*[:=]\s*['"][^'"]{10,}['"](?!.*process\.env)/i, name: 'Hardcoded secret' },
  { pattern: /Bearer\s+[a-zA-Z0-9._-]{20,}/, name: 'Hardcoded Bearer token' },
  { pattern: /mongodb(\+srv)?:\/\/[^:]+:[^@]+@/, name: 'MongoDB connection string with credentials' },
  { pattern: /postgres:\/\/[^:]+:[^@]+@/, name: 'PostgreSQL connection string with credentials' },
];

// Files/patterns to skip
const SKIP_PATTERNS = [
  /node_modules/,
  /\.git/,
  /package-lock\.json/,
  /\.min\.js$/,
  /security-scan\.js$/, // Don't scan self
];

// Get all JS, HTML files recursively
function getFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(ROOT, fullPath);

    // Skip excluded patterns
    if (SKIP_PATTERNS.some(p => p.test(relativePath))) {
      continue;
    }

    if (entry.isDirectory()) {
      getFiles(fullPath, files);
    } else if (entry.isFile() && /\.(js|html|json)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

// Check for hardcoded secrets
function checkSecrets(files) {
  const findings = [];

  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    const relativePath = path.relative(ROOT, file);
    const lines = content.split('\n');

    lines.forEach((line, idx) => {
      // Skip comments
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) return;

      SECRET_PATTERNS.forEach(({ pattern, name }) => {
        if (pattern.test(line)) {
          // Filter out false positives
          if (line.includes('process.env')) return;
          if (line.includes('example') || line.includes('Example')) return;
          if (line.includes('placeholder')) return;
          if (line.includes('your-')) return;

          findings.push({
            file: relativePath,
            line: idx + 1,
            type: name,
            content: line.trim().slice(0, 80)
          });
        }
      });
    });
  });

  return findings;
}

// Check API endpoints have auth
function checkApiAuth(files) {
  const findings = [];
  const apiFiles = files.filter(f => f.includes('/api/'));

  apiFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    const relativePath = path.relative(ROOT, file);

    // Skip auth.js itself
    if (relativePath.includes('auth.js')) return;

    // Check if file has a handler function
    if (content.includes('export default') && content.includes('handler')) {
      // Check if it has authentication
      const hasAuthCheck = content.includes('isAuthenticated') ||
                          content.includes('verifySessionToken') ||
                          content.includes('401') ||
                          content.includes('Unauthorized');

      // Some endpoints might be intentionally public (webhooks, public data)
      const isPublicEndpoint = relativePath.includes('webhook') ||
                               relativePath.includes('create-checkout') ||
                               relativePath.includes('order-rules');

      if (!hasAuthCheck && !isPublicEndpoint) {
        findings.push({
          file: relativePath,
          issue: 'No authentication check found'
        });
      }
    }
  });

  return findings;
}

// Check for potential XSS vulnerabilities
function checkXSS(files) {
  const findings = [];
  const jsFiles = files.filter(f => f.endsWith('.js') && !f.includes('/api/'));

  jsFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    const relativePath = path.relative(ROOT, file);
    const lines = content.split('\n');

    lines.forEach((line, idx) => {
      // Check for innerHTML with user data
      if (line.includes('.innerHTML') && !line.includes('escapeHtml')) {
        // Check if it's using template literals with variables
        if (line.includes('${') && !line.includes('escapeHtml')) {
          // Check if it's likely using user/storage data
          if (line.includes('item.') || line.includes('data.') ||
              line.includes('localStorage') || line.includes('sessionStorage')) {
            findings.push({
              file: relativePath,
              line: idx + 1,
              issue: 'innerHTML with potentially unescaped user data',
              content: line.trim().slice(0, 80)
            });
          }
        }
      }

      // Check for document.write
      if (line.includes('document.write')) {
        findings.push({
          file: relativePath,
          line: idx + 1,
          issue: 'document.write usage (potential XSS)',
          content: line.trim().slice(0, 80)
        });
      }

      // Check for eval
      if (/\beval\s*\(/.test(line)) {
        findings.push({
          file: relativePath,
          line: idx + 1,
          issue: 'eval() usage (dangerous)',
          content: line.trim().slice(0, 80)
        });
      }
    });
  });

  return findings;
}

// Check for exposed sensitive info in frontend
function checkExposedData(files) {
  const findings = [];
  const frontendFiles = files.filter(f =>
    (f.endsWith('.js') || f.endsWith('.html')) && !f.includes('/api/')
  );

  const sensitivePatterns = [
    { pattern: /CLOVER_API_KEY/, name: 'Clover API key reference' },
    { pattern: /DASHBOARD_PASSWORD/, name: 'Dashboard password reference' },
    { pattern: /REDIS.*TOKEN/i, name: 'Redis token reference' },
    { pattern: /process\.env\.[A-Z_]+/, name: 'process.env in frontend' },
  ];

  frontendFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    const relativePath = path.relative(ROOT, file);

    sensitivePatterns.forEach(({ pattern, name }) => {
      if (pattern.test(content)) {
        // Check it's not in a comment
        const match = content.match(pattern);
        if (match) {
          findings.push({
            file: relativePath,
            issue: name
          });
        }
      }
    });
  });

  return findings;
}

// Main validation
function validate() {
  console.log(`\n${colors.bold}Security Scanner${colors.reset}\n`);
  console.log('Scanning for common security issues...\n');

  let hasErrors = false;
  let hasWarnings = false;

  try {
    const files = getFiles(ROOT);
    console.log(`Scanning ${colors.blue}${files.length}${colors.reset} files...\n`);

    // 1. Check for hardcoded secrets
    console.log(`${colors.bold}1. Hardcoded Secrets${colors.reset}`);
    const secrets = checkSecrets(files);
    if (secrets.length > 0) {
      hasErrors = true;
      log('red', '✗', `Found ${secrets.length} potential hardcoded secrets:`);
      secrets.forEach(s => {
        console.log(`    ${s.file}:${s.line} - ${s.type}`);
        console.log(`      ${colors.cyan}${s.content}${colors.reset}`);
      });
    } else {
      log('green', '✓', 'No hardcoded secrets detected');
    }
    console.log('');

    // 2. Check API auth
    console.log(`${colors.bold}2. API Authentication${colors.reset}`);
    const authIssues = checkApiAuth(files);
    if (authIssues.length > 0) {
      hasWarnings = true;
      log('yellow', '!', `${authIssues.length} API endpoints may lack authentication:`);
      authIssues.forEach(a => {
        console.log(`    ${a.file}: ${a.issue}`);
      });
    } else {
      log('green', '✓', 'All non-public API endpoints have auth checks');
    }
    console.log('');

    // 3. Check XSS vulnerabilities
    console.log(`${colors.bold}3. XSS Vulnerabilities${colors.reset}`);
    const xssIssues = checkXSS(files);
    if (xssIssues.length > 0) {
      hasWarnings = true;
      log('yellow', '!', `${xssIssues.length} potential XSS vulnerabilities:`);
      xssIssues.forEach(x => {
        console.log(`    ${x.file}:${x.line} - ${x.issue}`);
      });
    } else {
      log('green', '✓', 'No obvious XSS vulnerabilities detected');
    }
    console.log('');

    // 4. Check exposed sensitive data
    console.log(`${colors.bold}4. Exposed Sensitive Data${colors.reset}`);
    const exposedData = checkExposedData(files);
    if (exposedData.length > 0) {
      hasWarnings = true;
      log('yellow', '!', `${exposedData.length} potential sensitive data exposures:`);
      exposedData.forEach(e => {
        console.log(`    ${e.file}: ${e.issue}`);
      });
    } else {
      log('green', '✓', 'No sensitive data exposed in frontend');
    }
    console.log('');

    // Summary
    console.log(`${colors.bold}Summary${colors.reset}`);
    console.log('─'.repeat(40));

    if (!hasErrors && !hasWarnings) {
      log('green', '✓', 'No security issues detected!');
    } else if (!hasErrors) {
      log('yellow', '!', 'Warnings found - review recommended but not blocking');
    } else {
      log('red', '✗', 'Security issues found - please address before deploying');
    }

    console.log('');
    console.log(`${colors.cyan}Note: This scanner checks for common issues but is not exhaustive.`);
    console.log(`Consider using tools like npm audit, Snyk, or OWASP ZAP for deeper analysis.${colors.reset}`);
    console.log('');

    return hasErrors ? 1 : 0;

  } catch (error) {
    log('red', '✗', `Error: ${error.message}`);
    return 1;
  }
}

process.exit(validate());
