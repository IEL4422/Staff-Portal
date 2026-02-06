const { createProxyMiddleware } = require('http-proxy-middleware');
const { spawn, execSync } = require('child_process');
const path = require('path');
const net = require('net');

const BACKEND_PORT = 8000;
const backendDir = path.resolve(__dirname, '..', '..', 'backend');

function checkPort(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(2000);
    socket.on('connect', () => { socket.destroy(); resolve(true); });
    socket.on('timeout', () => { socket.destroy(); resolve(false); });
    socket.on('error', () => { socket.destroy(); resolve(false); });
    socket.connect(port, '127.0.0.1');
  });
}

let backendProcess = null;
let starting = false;

function installDeps() {
  try {
    execSync('python3 -m pip install --break-system-packages -q -r requirements.txt 2>&1', {
      cwd: backendDir,
      stdio: 'inherit',
      timeout: 180000,
      env: { ...process.env, PATH: `/home/appuser/.local/bin:${process.env.PATH}` },
    });
    console.log('[BACKEND] Dependencies installed successfully');
  } catch (e) {
    console.error('[BACKEND] pip install failed, trying pip3 fallback...');
    try {
      execSync('pip3 install --break-system-packages -q -r requirements.txt 2>&1', {
        cwd: backendDir,
        stdio: 'inherit',
        timeout: 180000,
        env: { ...process.env, PATH: `/home/appuser/.local/bin:${process.env.PATH}` },
      });
      console.log('[BACKEND] Dependencies installed via pip3');
    } catch (e2) {
      console.error('[BACKEND] All pip install attempts failed:', e2.message);
    }
  }
}

function spawnBackend() {
  const child = spawn('python3', ['-m', 'uvicorn', 'server:app', '--host', '0.0.0.0', '--port', String(BACKEND_PORT)], {
    cwd: backendDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
    env: { ...process.env, PATH: `/home/appuser/.local/bin:${process.env.PATH}` },
  });

  child.unref();

  child.stdout.on('data', (d) => process.stdout.write(`[BACKEND] ${d}`));
  child.stderr.on('data', (d) => process.stderr.write(`[BACKEND] ${d}`));
  child.on('exit', (code) => {
    console.log(`[BACKEND] Process exited with code ${code}`);
    backendProcess = null;
    if (code !== 0) {
      console.log('[BACKEND] Scheduling restart in 3 seconds...');
      setTimeout(() => ensureBackend(), 3000);
    }
  });

  backendProcess = child;
  return child;
}

async function ensureBackend() {
  if (starting) return;
  starting = true;

  try {
    const alive = await checkPort(BACKEND_PORT);
    if (alive) {
      console.log('[BACKEND] Already running on port ' + BACKEND_PORT);
      return;
    }

    console.log('[BACKEND] Installing Python dependencies...');
    installDeps();

    console.log('[BACKEND] Starting Python backend...');
    spawnBackend();

    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 1000));
      if (await checkPort(BACKEND_PORT)) {
        console.log('[BACKEND] Ready on port ' + BACKEND_PORT);
        return;
      }
    }
    console.error('[BACKEND] Failed to start within 40 seconds');
  } finally {
    starting = false;
  }
}

setInterval(async () => {
  const alive = await checkPort(BACKEND_PORT);
  if (!alive && !starting) {
    console.log('[BACKEND] Health check failed, restarting...');
    ensureBackend();
  }
}, 15000);

module.exports = function(app) {
  ensureBackend();

  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:' + BACKEND_PORT,
      changeOrigin: true,
      onError: async (err, req, res) => {
        console.error('[PROXY] Error:', err.message);
        ensureBackend();
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Backend unavailable, restarting...' }));
      },
      onProxyReq: (proxyReq, req) => {
        console.log('[PROXY]', req.method, req.url);
      },
    })
  );
};
