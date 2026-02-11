#!/usr/bin/env node
/**
 * Price Consistency Checker
 *
 * Scans menu.html for prices and flags anomalies:
 * - $0.00 or missing prices
 * - Unusually high or low prices for category
 * - Price format issues
 *
 * Run: node scripts/validate-prices.js
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

// Expected price ranges by category (in dollars)
const PRICE_RANGES = {
  bread: { min: 3, max: 15, typical: '4-10' },
  bar: { min: 2, max: 8, typical: '3-5' },
  cookie: { min: 1, max: 6, typical: '2-4' },
  pastry: { min: 2, max: 10, typical: '3-6' },
  cake: { min: 15, max: 100, typical: '25-60' },
  sandwich: { min: 6, max: 18, typical: '8-14' },
  drink: { min: 2, max: 8, typical: '3-6' },
  breakfast: { min: 4, max: 15, typical: '6-12' },
  dessert: { min: 3, max: 12, typical: '4-8' },
  default: { min: 1, max: 50, typical: '2-20' }
};

// Extract items with prices from menu.html
function getMenuItems() {
  const menuPath = path.join(ROOT, 'menu.html');
  const content = fs.readFileSync(menuPath, 'utf-8');

  const items = [];

  // Match add-to-cart buttons with data attributes
  const regex = /<button[^>]*class="add-to-cart-btn"[^>]*data-id="([^"]+)"[^>]*data-name="([^"]+)"[^>]*data-price="([^"]*)"[^>]*>/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    items.push({
      id: match[1],
      name: match[2],
      price: match[3],
      priceNum: parseFloat(match[3]) || 0
    });
  }

  // Also try alternate attribute order
  const regex2 = /<button[^>]*data-id="([^"]+)"[^>]*data-name="([^"]+)"[^>]*data-price="([^"]*)"[^>]*/g;

  while ((match = regex2.exec(content)) !== null) {
    // Check if we already have this item
    if (!items.find(i => i.id === match[1])) {
      items.push({
        id: match[1],
        name: match[2],
        price: match[3],
        priceNum: parseFloat(match[3]) || 0
      });
    }
  }

  return items;
}

// Get category from item ID
function getCategory(itemId) {
  const prefix = itemId.split('-')[0];
  return PRICE_RANGES[prefix] ? prefix : 'default';
}

// Main validation
function validate() {
  console.log(`\n${colors.bold}Price Consistency Checker${colors.reset}\n`);
  console.log('Scanning menu.html for price anomalies...\n');

  let hasErrors = false;
  let hasWarnings = false;

  try {
    const items = getMenuItems();

    console.log(`Found ${colors.blue}${items.length}${colors.reset} items with price data\n`);

    // Check for zero or missing prices
    const zeroPrices = items.filter(i => i.priceNum === 0);
    if (zeroPrices.length > 0) {
      hasErrors = true;
      log('red', '✗', `Items with $0.00 or missing price:`);
      zeroPrices.forEach(i => {
        console.log(`    - ${i.id}: "${i.name}" (price: "${i.price}")`);
      });
      console.log('');
    }

    // Check for prices outside expected range
    const outOfRange = [];
    items.forEach(item => {
      if (item.priceNum === 0) return; // Already flagged

      const category = getCategory(item.id);
      const range = PRICE_RANGES[category];

      if (item.priceNum < range.min || item.priceNum > range.max) {
        outOfRange.push({
          ...item,
          category,
          expected: range
        });
      }
    });

    if (outOfRange.length > 0) {
      hasWarnings = true;
      log('yellow', '!', `Items with unusual prices for their category:`);
      outOfRange.forEach(i => {
        const status = i.priceNum < i.expected.min ? 'LOW' : 'HIGH';
        console.log(`    - ${i.id}: $${i.priceNum.toFixed(2)} [${status}] (${i.category} typical: $${i.expected.typical})`);
      });
      console.log('');
    }

    // Check for non-standard price formats (not ending in .00, .50, .25, .75, .99, .95)
    const oddPrices = items.filter(i => {
      if (i.priceNum === 0) return false;
      const cents = Math.round((i.priceNum % 1) * 100);
      return ![0, 25, 50, 75, 95, 99, 49].includes(cents);
    });

    if (oddPrices.length > 0) {
      hasWarnings = true;
      log('yellow', '!', `Items with non-standard price endings:`);
      oddPrices.forEach(i => {
        console.log(`    - ${i.id}: $${i.priceNum.toFixed(2)} "${i.name}"`);
      });
      console.log('');
    }

    // Price statistics by category
    console.log(`${colors.bold}Price Statistics by Category:${colors.reset}`);
    console.log('┌──────────────┬───────┬─────────┬─────────┬─────────┬──────────┐');
    console.log('│ Category     │ Count │ Min     │ Max     │ Avg     │ Expected │');
    console.log('├──────────────┼───────┼─────────┼─────────┼─────────┼──────────┤');

    const categories = {};
    items.forEach(item => {
      if (item.priceNum === 0) return;
      const cat = getCategory(item.id);
      if (!categories[cat]) {
        categories[cat] = [];
      }
      categories[cat].push(item.priceNum);
    });

    Object.entries(categories).sort().forEach(([cat, prices]) => {
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
      const range = PRICE_RANGES[cat] || PRICE_RANGES.default;

      const catPad = cat.padEnd(12);
      const countPad = String(prices.length).padStart(5);
      const minPad = ('$' + min.toFixed(2)).padStart(7);
      const maxPad = ('$' + max.toFixed(2)).padStart(7);
      const avgPad = ('$' + avg.toFixed(2)).padStart(7);
      const expPad = ('$' + range.typical).padStart(8);

      console.log(`│ ${catPad} │ ${countPad} │ ${minPad} │ ${maxPad} │ ${avgPad} │ ${expPad} │`);
    });

    console.log('└──────────────┴───────┴─────────┴─────────┴─────────┴──────────┘');
    console.log('');

    // Price distribution histogram
    console.log(`${colors.bold}Price Distribution:${colors.reset}`);
    const brackets = [
      { label: '$0-5', min: 0, max: 5, count: 0 },
      { label: '$5-10', min: 5, max: 10, count: 0 },
      { label: '$10-15', min: 10, max: 15, count: 0 },
      { label: '$15-25', min: 15, max: 25, count: 0 },
      { label: '$25-50', min: 25, max: 50, count: 0 },
      { label: '$50+', min: 50, max: Infinity, count: 0 }
    ];

    items.forEach(item => {
      if (item.priceNum === 0) return;
      const bracket = brackets.find(b => item.priceNum >= b.min && item.priceNum < b.max);
      if (bracket) bracket.count++;
    });

    const maxCount = Math.max(...brackets.map(b => b.count));
    brackets.forEach(b => {
      const barLen = Math.round((b.count / maxCount) * 30) || 0;
      const bar = '█'.repeat(barLen);
      console.log(`  ${b.label.padEnd(7)} ${bar} ${b.count}`);
    });

    console.log('');

    // Final status
    if (!hasErrors && !hasWarnings) {
      log('green', '✓', 'All prices look consistent!');
    } else if (!hasErrors) {
      log('green', '✓', 'No critical price issues (warnings are advisory)');
    } else {
      log('red', '✗', 'Price issues found - please review before deploying');
    }

    console.log('');
    return hasErrors ? 1 : 0;

  } catch (error) {
    log('red', '✗', `Error: ${error.message}`);
    return 1;
  }
}

process.exit(validate());
