const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

console.log('[SERVER] Starting frontend proxy server...');
console.log('[SERVER] Backend URL:', BACKEND_URL);

// Proxy API requests to backend - MUST come before static files
app.use(createProxyMiddleware({
  target: BACKEND_URL,
  changeOrigin: true,
  filter: (pathname, req) => pathname.startsWith('/api'),
  logLevel: 'debug',
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[PROXY] ${req.method} ${req.path} → ${BACKEND_URL}${req.path}`);
    console.log(`[PROXY] Headers:`, req.headers.authorization ? 'Authorization present' : 'No auth');
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`[PROXY] ${req.method} ${req.path} ← Status ${proxyRes.statusCode}`);
  },
  onError: (err, req, res) => {
    console.error('[PROXY] Error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Proxy error', message: err.message });
    }
  },
}));

// Serve static files from build directory
app.use(express.static(path.join(__dirname, 'frontend', 'build'), {
  index: false, // Don't serve index.html automatically
}));

// Handle client-side routing - return index.html for all other routes
app.use((req, res) => {
  console.log(`[STATIC] Serving index.html for ${req.path}`);
  res.sendFile(path.join(__dirname, 'frontend', 'build', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n[SERVER] Frontend server running on http://0.0.0.0:${PORT}`);
  console.log(`[SERVER] Proxying /api/* requests to ${BACKEND_URL}\n`);
});
