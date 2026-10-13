const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./routes/api');
const sessionManager = require('./baileys/sessionManager');
const db = require('./database/db');

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
sessionManager.setSocketIO(io);

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static uploads directory
app.use('/uploads', express.static(path.join(__dirname, '..', 'public', 'uploads')));

// API routes
app.use('/api', apiRoutes);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  // Send initial status and numbers data
  socket.emit('session_list', sessionManager.getAllSessionsStatus());
  socket.emit('stats_update', db.getAllNumbersStats());

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 WA MANAGER PRO - Backend Server Running`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`📂 Sessions folder: ${path.join(__dirname, '..', 'sessions')}`);
  console.log(`===============================================`);

  // Initialize and restore any active sessions
  sessionManager.initAllSessions().catch(err => {
    console.error('Failed to init sessions:', err);
  });
});
