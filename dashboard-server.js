#!/usr/bin/env node

/**
 * dashboard-server.js
 * 
 * Serves the dashboard with credentials injected from .env
 * More secure than embedding credentials in HTML
 * 
 * Usage:
 *   node dashboard-server.js
 *   node dashboard-server.js --port 8080
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.argv.includes('--port') 
  ? parseInt(process.argv[process.argv.indexOf('--port') + 1]) 
  : 8080;

const ENV_FILE = path.join(__dirname, '.env');
const DASHBOARD_FILE = path.join(__dirname, 'dashboard-realtime.html');

// Load credentials from .env
function loadCredentials() {
  const env = {};
  
  if (!fs.existsSync(ENV_FILE)) {
    console.error('❌ .env file not found');
    return null;
  }
  
  const content = fs.readFileSync(ENV_FILE, 'utf-8');
  
  content.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      env[key] = value;
    }
  });
  
  return {
    url: env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL,
    key: env.SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_SERVICE_ROLE_KEY
  };
}

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname;
  
  // Default to dashboard
  if (pathname === '/') {
    pathname = '/dashboard-realtime.html';
  }
  
  const filePath = path.join(__dirname, pathname);
  const ext = path.extname(filePath).toLowerCase();
  
  // Security: Only serve files from project directory
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  
  // Handle dashboard with credential injection
  if (pathname === '/dashboard-realtime.html' || pathname === '/dashboard.html') {
    if (!fs.existsSync(DASHBOARD_FILE)) {
      res.writeHead(404);
      res.end('Dashboard not found');
      return;
    }
    
    const credentials = loadCredentials();
    
    if (!credentials || !credentials.url || !credentials.key) {
      res.writeHead(500);
      res.end('Supabase credentials not configured in .env');
      return;
    }
    
    let html = fs.readFileSync(DASHBOARD_FILE, 'utf-8');
    
    // Inject credentials
    html = html.replace(
      "const SUPABASE_URL = localStorage.getItem('supabase_url') || '';",
      `// Injected by server\n    const SUPABASE_URL = '${credentials.url}';`
    );
    
    html = html.replace(
      "const SUPABASE_KEY = localStorage.getItem('supabase_key') || '';",
      `    const SUPABASE_KEY = '${credentials.key}';`
    );
    
    // Skip the credential check since we're injecting
    html = html.replace(
      `// Check if credentials are set
      if (!SUPABASE_URL || !SUPABASE_KEY || SUPABASE_URL === 'local') {`,
      `// Credentials injected by server
      if (!SUPABASE_URL || !SUPABASE_KEY) {`
    );
    
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
    console.log(`✅ Served dashboard to ${req.connection.remoteAddress}`);
    return;
  }
  
  // Serve static files
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
    return;
  }
  
  // 404
  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log('🚀 Dashboard Server Running');
  console.log('');
  console.log(`   URL: http://localhost:${PORT}`);
  console.log(`   Dashboard: http://localhost:${PORT}/dashboard-realtime.html`);
  console.log('');
  console.log('Press Ctrl+C to stop');
  console.log('');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  server.close(() => {
    process.exit(0);
  });
});
