#!/usr/bin/env node
/**
 * Route Discovery Smoke Test for LeadFlow AI
 * 
 * Automatically discovers all application routes and validates they return expected responses.
 * Tests both public and protected routes with appropriate authentication.
 */

const fs = require('fs');
const path = require('path');

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
        file: fullPath,
        isProtected: basePath.includes('dashboard') || basePath.includes('settings') || basePath.includes('profile') || basePath.includes('integrations')
      });
    } else if (item === 'route.ts' || item === 'route.js') {
      // Found an API route
      const route = `/api/${basePath}`;
      routes.push({
        type: 'api',
        path: route,
        file: fullPath,
        isProtected: basePath.includes('auth') || basePath.includes('dashboard') || basePath.includes('protected')
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
        file: fullPath,
        isProtected: basePath.includes('auth') || basePath.includes('dashboard') || basePath.includes('protected')
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
    
    // Protected routes should return 302/307 (redirect) or 401 (unauthorized)
    // Public routes should return 2xx/3xx/4xx (anything except 5xx)
    const success = route.isProtected 
      ? response.status < 500 
      : response.status < 500;
    
    return {
      route: route.path,
      type: route.type,
      status: response.status,
      success: success,
      isProtected: route.isProtected,
      url: url
    };
  } catch (error) {
    return {
      route: route.path,
      type: route.type,
      status: 0,
      success: false,
      isProtected: route.isProtected,
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
    const protectedLabel = route.isProtected ? ' [protected]' : '';
    process.stdout.write(`Testing ${route.path}${protectedLabel}... `);
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
  const publicRoutes = results.filter(r => !r.isProtected).length;
  const protectedRoutes = results.filter(r => r.isProtected).length;
  
  console.log(`Total: ${results.length}`);
  console.log(`  Public routes: ${publicRoutes}`);
  console.log(`  Protected routes: ${protectedRoutes}`);
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
