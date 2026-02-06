const { createProxyMiddleware } = require('http-proxy-middleware');
const { spawn } = require('child_process');
const path = require('path');
const net = require('net');

function checkPort(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.on('connect', () => { socket.destroy(); resolve(true); });
    socket.on('timeout', () => { socket.destroy(); resolve(false); });
    socket.on('error', () => { socket.destroy(); resolve(false); });
    socket.connect(port, '127.0.0.1');
  });
}

let backendStarted = false;

async function ensureBackend() {
  if (backendStarted) return;
  backendStarted = true;

  const alive = await checkPort(8000);
  if (alive) {
    console.log('[BACKEND] Already running on port 8000');
    return;
  }

  console.log('[BACKEND] Installing Python dependencies...');
  const backendDir = path.resolve(__dirname, '..', '..', 'backend');
  try {
    require('child_process').execSync(
      'pip install --break-system-packages -q -r requirements.txt',
      { cwd: backendDir, stdio: 'inherit', timeout: 120000 }
    );
  } catch (e) {
    console.error('[BACKEND] pip install failed:', e.message);
  }

  console.log('[BACKEND] Starting Python backend...');
  const child = spawn('python3', ['-m', 'uvicorn', 'server:app', '--host', '0.0.0.0', '--port', '8000'], {
    cwd: backendDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  });

  child.stdout.on('data', (d) => process.stdout.write(`[BACKEND] ${d}`));
  child.stderr.on('data', (d) => process.stderr.write(`[BACKEND] ${d}`));
  child.on('exit', (code) => {
    console.log(`[BACKEND] Process exited with code ${code}`);
    backendStarted = false;
  });

  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 1000));
    if (await checkPort(8000)) {
      console.log('[BACKEND] Ready on port 8000');
      return;
    }
  }
  console.error('[BACKEND] Failed to start within 30 seconds');
}

module.exports = function(app) {
  ensureBackend();

  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:8000',
      changeOrigin: true,
      logLevel: 'debug',
      onError: (err, req, res) => {
        console.error('[PROXY] Error:', err);
        res.writeHead(500, {
          'Content-Type': 'text/plain',
        });
        res.end('Proxy error: ' + err.message);
      },
      onProxyReq: (proxyReq, req, res) => {
        console.log('[PROXY]', req.method, req.url, '→', proxyReq.path);
      },
    })
  );
};
