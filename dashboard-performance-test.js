#!/usr/bin/env node

/**
 * Dashboard Performance Test
 * Verifies all performance optimization criteria are met
 */

const fs = require('fs');
const path = require('path');

console.log('═══════════════════════════════════════════════════════════');
console.log('🚀 LeadFlow Dashboard Performance Test');
console.log('═══════════════════════════════════════════════════════════\n');

const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function test(name, check, details = '') {
  const passed = check();
  results.tests.push({ name, passed, details });
  if (passed) {
    results.passed++;
    console.log(`✅ ${name}`);
  } else {
    results.failed++;
    console.log(`❌ ${name}`);
    if (details) console.log(`   ${details}`);
  }
  return passed;
}

// Test 1: Optimized dashboard HTML exists
test(
  'Optimized dashboard HTML exists',
  () => fs.existsSync(path.join(__dirname, 'dashboard-optimized.html')),
  'Create dashboard-optimized.html with performance improvements'
);

// Test 2: Vite config has code splitting
test(
  'Vite config has code splitting enabled',
  () => {
    const viteConfig = fs.readFileSync(path.join(__dirname, 'frontend/vite.config.ts'), 'utf-8');
    return viteConfig.includes('manualChunks') && 
           viteConfig.includes('vendor-react') &&
           viteConfig.includes('rollupOptions');
  },
  'Update vite.config.ts with manualChunks for code splitting'
);

// Test 3: Frontend uses lazy loading
test(
  'Frontend main.tsx uses React.lazy for code splitting',
  () => {
    const mainTsx = fs.readFileSync(path.join(__dirname, 'frontend/src/main.tsx'), 'utf-8');
    return (mainTsx.includes('React.lazy') || mainTsx.includes('lazy(')) && 
           mainTsx.includes('Suspense') &&
           mainTsx.includes('import(');
  },
  'Update main.tsx to use React.lazy and Suspense'
);

// Test 4: Performance monitoring is implemented
test(
  'Performance monitoring component exists',
  () => fs.existsSync(path.join(__dirname, 'frontend/src/components/PerformanceMonitor.tsx')),
  'Create PerformanceMonitor.tsx component'
);

// Test 5: Database optimization SQL exists
test(
  'Database optimization SQL exists',
  () => fs.existsSync(path.join(__dirname, 'sql/dashboard-performance-optimizations.sql')),
  'Create SQL file with database optimizations'
);

// Test 6: Dashboard has skeleton loading
test(
  'Optimized dashboard has skeleton loading',
  () => {
    const dashboard = fs.readFileSync(path.join(__dirname, 'dashboard-optimized.html'), 'utf-8');
    return dashboard.includes('skeleton') && dashboard.includes('skeleton-shine');
  },
  'Add skeleton loading states to dashboard'
);

// Test 7: Dashboard has client-side caching
test(
  'Optimized dashboard has client-side caching',
  () => {
    const dashboard = fs.readFileSync(path.join(__dirname, 'dashboard-optimized.html'), 'utf-8');
    return dashboard.includes('cache') && 
           dashboard.includes('getCache') && 
           dashboard.includes('setCache') &&
           dashboard.includes('CACHE_TTL');
  },
  'Add client-side caching with TTL'
);

// Test 8: Dashboard loads critical data first
test(
  'Dashboard prioritizes critical data loading',
  () => {
    const dashboard = fs.readFileSync(path.join(__dirname, 'dashboard-optimized.html'), 'utf-8');
    return dashboard.includes('loadCriticalData') && dashboard.includes('loadNonCriticalData');
  },
  'Implement critical vs non-critical data loading'
);

// Test 9: Performance badge for load time monitoring
test(
  'Dashboard has performance badge for monitoring',
  () => {
    const dashboard = fs.readFileSync(path.join(__dirname, 'dashboard-optimized.html'), 'utf-8');
    return dashboard.includes('perf-badge') && dashboard.includes('DASHBOARD_START_TIME');
  },
  'Add performance monitoring badge to dashboard'
);

// Test 10: Package.json has performance dependencies
test(
  'Package.json has web-vitals dependency',
  () => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'frontend/package.json'), 'utf-8'));
    return packageJson.dependencies && packageJson.dependencies['web-vitals'];
  },
  'Add web-vitals to dependencies'
);

// Test 11: Vite config has minification enabled
test(
  'Vite config has production optimizations',
  () => {
    const viteConfig = fs.readFileSync(path.join(__dirname, 'frontend/vite.config.ts'), 'utf-8');
    return viteConfig.includes('minify:') && 
           (viteConfig.includes('terser') || viteConfig.includes('esbuild')) &&
           viteConfig.includes('cssMinify');
  },
  'Add minification (terser or esbuild) and cssMinify'
);

// Test 12: Dashboard queries are optimized with limits
test(
  'Dashboard queries use LIMIT for optimization',
  () => {
    const dashboard = fs.readFileSync(path.join(__dirname, 'dashboard-optimized.html'), 'utf-8');
    return dashboard.includes('.limit(') || dashboard.includes('limit:');
  },
  'Add LIMIT to database queries'
);

console.log('\n═══════════════════════════════════════════════════════════');
console.log('📊 Test Results Summary');
console.log('═══════════════════════════════════════════════════════════');
console.log(`Total: ${results.passed + results.failed} tests`);
console.log(`Passed: ${results.passed} ✅`);
console.log(`Failed: ${results.failed} ❌`);
console.log('═══════════════════════════════════════════════════════════\n');

if (results.failed === 0) {
  console.log('✅ ALL PERFORMANCE TESTS PASSED');
  console.log('\nOptimizations implemented:');
  console.log('  • Code splitting with manual chunks');
  console.log('  • Lazy loading for route components');
  console.log('  • Client-side caching with TTL');
  console.log('  • Critical data prioritization');
  console.log('  • Skeleton loading states');
  console.log('  • Performance monitoring badge');
  console.log('  • Production build optimizations');
  console.log('  • Database query optimization with LIMIT');
  console.log('  • Web Vitals tracking component');
  console.log('\nDashboard load target: < 2 seconds');
} else {
  console.log('❌ SOME TESTS FAILED - Review the checklist above');
}

// Save results
fs.writeFileSync(
  path.join(__dirname, 'test-results.json'),
  JSON.stringify({
    timestamp: new Date().toISOString(),
    ...results,
    allPassed: results.failed === 0
  }, null, 2)
);

process.exit(results.failed === 0 ? 0 : 1);
