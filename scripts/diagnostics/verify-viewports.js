#!/usr/bin/env node

/**
 * Viewport Size Verification
 * Verifies media queries cover iPhone SE, iPhone 14, and Pixel 7
 */

const fs = require('fs');

console.log('📱 Viewport Size Coverage Verification');
console.log('═════════════════════════════════════\n');

// Device viewport widths
const devices = {
  'iPhone SE': 375,    // 375x667
  'iPhone 14': 390,    // 390x844
  'Pixel 7': 412       // 412x915
};

// Read dashboard.html
const dashboardContent = fs.readFileSync('./dashboard.html', 'utf-8');

// Extract media queries
const mediaQueryRegex = /@media\s*\([^)]*max-width:\s*(\d+)px\s*\)/g;
const mediaQueries = [];
let match;
while ((match = mediaQueryRegex.exec(dashboardContent)) !== null) {
  mediaQueries.push(parseInt(match[1]));
}

// Also check for min-width queries
const minWidthRegex = /@media\s*\([^)]*min-width:\s*(\d+)px\s*\)/g;
while ((match = minWidthRegex.exec(dashboardContent)) !== null) {
  mediaQueries.push(parseInt(match[1]));
}

console.log('Found media query breakpoints:', [...new Set(mediaQueries)].sort((a, b) => a - b));
console.log();

// Check each device
let allCovered = true;
for (const [device, width] of Object.entries(devices)) {
  // A device is covered if there's a max-width query >= its width
  // or if the styles work for that width
  const hasMobileStyles = dashboardContent.includes('max-width: 768px') && width <= 768;
  const covered = hasMobileStyles || mediaQueries.some(mq => mq >= width);
  
  console.log(`${device} (${width}px): ${covered ? '✅ Covered' : '❌ Not covered'}`);
  if (!covered) allCovered = false;
}

console.log('\n═════════════════════════════════════');

if (allCovered) {
  console.log('✅ All target devices are covered by media queries!');
} else {
  console.log('⚠️ Some devices may need additional media query coverage');
}

// Verify specific acceptance criteria
console.log('\n📋 Acceptance Criteria Verification:');
console.log('─────────────────────────────────────');

const checks = [
  {
    name: 'Tables scroll horizontally on mobile',
    test: () => dashboardContent.includes('overflow-x: auto') && dashboardContent.includes('table-wrapper'),
    evidence: '.table-wrapper with overflow-x: auto'
  },
  {
    name: 'Navigation collapses to hamburger menu on screens < 768px',
    test: () => dashboardContent.includes('nav-toggle') && dashboardContent.includes('@media (max-width: 768px)'),
    evidence: 'nav-toggle button with @media (max-width: 768px)'
  },
  {
    name: 'Task cards stack vertically on mobile (not grid)',
    test: () => dashboardContent.includes('.grid4 { grid-template-columns: 1fr; }'),
    evidence: '.grid4 stacks to single column'
  },
  {
    name: 'Touch-friendly interactions',
    test: () => dashboardContent.includes('touch-action: manipulation') || dashboardContent.includes('-webkit-tap-highlight-color'),
    evidence: 'touch-action CSS properties'
  }
];

let allCriteriaMet = true;
for (const check of checks) {
  const passed = check.test();
  console.log(`${passed ? '✅' : '❌'} ${check.name}`);
  console.log(`   Evidence: ${check.evidence}`);
  if (!passed) allCriteriaMet = false;
}

console.log('\n═════════════════════════════════════');
if (allCriteriaMet) {
  console.log('✅ All acceptance criteria verified!');
  process.exit(0);
} else {
  console.log('❌ Some acceptance criteria not met');
  process.exit(1);
}
