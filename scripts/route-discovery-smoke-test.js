#!/usr/bin/env node
/**
 * Route Discovery Smoke Test
 * 
 * Automatically discovers all routes in the Next.js app and tests them.
 * This ensures all pages and API endpoints are accessible.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const DASHBOARD_DIR = path.join(__dirname, '..', 'product', 'lead-response', 'dashboard');
const APP_DIR = path.join(DASHBOARD_DIR, 'app');
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

// Colors for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

// Route discovery
function discoverRoutes(dir, basePath = '') {
  const routes = [];
  
  if (!fs.existsSync(dir)) {
    console.log(`${colors.yellow}Warning: Directory ${dir} does not exist${colors.reset}`);
    return routes;
  }
  
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Skip special directories
      if (item.startsWith('_') || item.startsWith('.') || item === 'api') {
        continue;
      }
      
      // Recursively discover routes
      const subRoutes = discoverRoutes(fullPath, path.join(basePath, item));
      routes.push(...subRoutes);
    } else if (item === 'page.tsx' || item === 'page.ts' || item === 'page.js') {
      // Found a page
      const route = basePath === '' ? '/' : `/${basePath}`;
      routes.push({
        type: 'page',
        path: route,
        file: fullPath
      });
    } else if (item === 'route.ts' || item === 'route.js') {
      // Found an API route
      const route = `/api/${basePath}`;
      routes.push({
        type: 'api',
        path: route,
        file: fullPath
      });
    }
  }
  
  return routes;
}

// Discover API routes separately
function discoverApiRoutes(dir, basePath = '') {
  const routes = [];
  
  if (!fs.existsSync(dir)) {
    return routes;
  }
  
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      if (item.startsWith('_') || item.startsWith('.')) {
        continue;
      }
      
      const subRoutes = discoverApiRoutes(fullPath, path.join(basePath, item));
      routes.push(...subRoutes);
    } else if (item === 'route.ts' || item === 'route.js') {
      const route = basePath === '' ? '/api' : `/api/${basePath}`;
      routes.push({
        type: 'api',
        path: route,
        file: fullPath
      });
    }
  }
  
  return routes;
}

// Test a route
async function testRoute(route) {
  const url = `${BASE_URL}${route.path}`;
  
  try {
    const response = await fetch(url, {
      method: route.type === 'api' ? 'GET' : 'GET',
      headers: {
        'Accept': route.type === 'api' ? 'application/json' : 'text/html'
      }
    });
    
    const success = response.status < 500; // Consider 4xx as valid (page exists but may require auth)
    
    return {
      route: route.path,
      type: route.type,
      status: response.status,
      success: success,
      url: url
    };
  } catch (error) {
    return {
      route: route.path,
      type: route.type,
      status: 0,
      success: false,
      error: error.message,
      url: url
    };
  }
}

// Main test runner
async function runSmokeTest() {
  console.log(`${colors.blue}================================${colors.reset}`);
  console.log(`${colors.blue}Route Discovery Smoke Test${colors.reset}`);
  console.log(`${colors.blue}================================${colors.reset}`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Dashboard Dir: ${DASHBOARD_DIR}`);
  console.log('');
  
  // Discover routes
  console.log(`${colors.blue}Discovering routes...${colors.reset}`);
  const pageRoutes = discoverRoutes(APP_DIR);
  const apiRoutes = discoverApiRoutes(path.join(APP_DIR, 'api'));
  const allRoutes = [...pageRoutes, ...apiRoutes];
  
  console.log(`Found ${pageRoutes.length} pages and ${apiRoutes.length} API routes`);
  console.log('');
  
  // Test routes
  console.log(`${colors.blue}Testing routes...${colors.reset}`);
  const results = [];
  
  for (const route of allRoutes) {
    process.stdout.write(`Testing ${route.path}... `);
    const result = await testRoute(route);
    results.push(result);
    
    if (result.success) {
      console.log(`${colors.green}✓${colors.reset} (${result.status})`);
    } else {
      console.log(`${colors.red}✗${colors.reset} (${result.status}${result.error ? ': ' + result.error : ''})`);
    }
  }
  
  // Summary
  console.log('');
  console.log(`${colors.blue}================================${colors.reset}`);
  console.log(`${colors.blue}Test Summary${colors.reset}`);
  console.log(`${colors.blue}================================${colors.reset}`);
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`Total: ${results.length}`);
  console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
  
  if (failed > 0) {
    console.log('');
    console.log(`${colors.red}Failed Routes:${colors.reset}`);
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.route} (${r.status})`);
    });
  }
  
  console.log('');
  
  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run if called directly
if (require.main === module) {
  runSmokeTest().catch(error => {
    console.error(`${colors.red}Error running smoke test:${colors.reset}`, error);
    process.exit(1);
  });
}

module.exports = { discoverRoutes, discoverApiRoutes, testRoute, runSmokeTest };
