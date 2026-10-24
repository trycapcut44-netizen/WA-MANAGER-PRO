const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

let apiRoutes = require('./routes/api');
if (apiRoutes && apiRoutes.default) apiRoutes = apiRoutes.default;

let sessionManager = require('./baileys/sessionManager');
if (sessionManager && sessionManager.default) sessionManager = sessionManager.default;

let db = require('./database/db');
if (db && db.default) db = db.default;

const app = express();
const server = http.createServer(app);

// Socket.io initialization with CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Pass io to session manager for real-time events
if (sessionManager && typeof sessionManager.setSocketIO === 'function') {
  sessionManager.setSocketIO(io);
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static uploads directory
app.use('/uploads', express.static(path.join(__dirname, '..', 'public', 'uploads')));

// API routes
const routerMiddleware = (typeof apiRoutes === 'function') ? apiRoutes : (apiRoutes?.default || apiRoutes);
app.use('/api', routerMiddleware);

// Serve frontend production build (cPanel / Hostinger / VPS / Cloud / Vercel Deployment)
const possibleDistPaths = [
  path.join(__dirname, '..', 'frontend', 'dist'),
  path.join(process.cwd(), 'frontend', 'dist'),
  path.join(__dirname, '..', 'dist'),
  path.join(process.cwd(), 'dist'),
  path.join(__dirname, '..', 'public')
];

const activeDistPath = possibleDistPaths.find(p => fs.existsSync(path.join(p, 'index.html')));

if (activeDistPath) {
  console.log(`[Frontend] Serving static UI from: ${activeDistPath}`);
  app.use(express.static(activeDistPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      res.sendFile(path.join(activeDistPath, 'index.html'));
    }
  });
} else {
  console.warn(`[Frontend] No built frontend found. Run 'npm run build' to generate frontend/dist.`);
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      res.status(200).send('<!DOCTYPE html><html><head><title>WA MANAGER PRO</title></head><body><h1>WA MANAGER PRO is running</h1><p>Frontend is building. Please refresh in a moment.</p></body></html>');
    }
  });
}

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  // Send initial status and numbers data
  if (sessionManager && typeof sessionManager.getAllSessionsStatus === 'function') {
    socket.emit('session_list', sessionManager.getAllSessionsStatus());
  }
  if (db && typeof db.getAllNumbersStats === 'function') {
    socket.emit('stats_update', db.getAllNumbersStats());
  }

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;

if (!process.env.VERCEL) {
  server.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`🚀 WA MANAGER PRO - Backend Server Running`);
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log(`📂 Sessions folder: ${path.join(__dirname, '..', 'sessions')}`);
    console.log(`===============================================`);

    // Initialize and restore any active sessions
    if (sessionManager && typeof sessionManager.initAllSessions === 'function') {
      sessionManager.initAllSessions().catch(err => {
        console.error('Failed to init sessions:', err);
      });
    }
  });
}

module.exports = app;
module.exports.server = server;
