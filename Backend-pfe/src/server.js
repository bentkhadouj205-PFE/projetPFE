import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import bcrypt from 'bcrypt';
import { supabase } from './supabaseClient.js';

// ───────────── Import Routes ─────────────
import notificationRoutes from './routes/notification.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/admin.js';
import demandeRoutes from './routes/demandeRoutes.js';
import employeeRoutes from './routes/employee.js';
import requestRoutes from './routes/request.js';
import chatRoutes from './routes/chatRoutes.js';
import pdfRoutes from './routes/pdfRoutes.js';
import emailCertificateRoutes from './routes/emailCertificate.js';
import validationRoutes from './routes/validation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://192.168.1.6:5173',
  'https://projet-2690ly2nn-bentkhadouj205-pfes-projects.vercel.app',
  /\.ngrok-free\.dev$/,
  /\.vercel\.app$/, // Allow all vercel.app subdomains
  process.env.FRONTEND_URL?.replace(/\/$/, ''), // Strip trailing slash for CORS safety
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning']
}));

// 🛡️ Global Ngrok Bypass & CORS Hardening
app.use((req, res, next) => {
  res.setHeader('ngrok-skip-browser-warning', 'true');

  // Handle manual preflight for problematic proxies
  if (req.method === 'OPTIONS') {
    const origin = req.headers.origin;
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed instanceof RegExp) return allowed.test(origin);
      return allowed === origin;
    });

    if (origin && isAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-requested-with, ngrok-skip-browser-warning');
      return res.sendStatus(204);
    }
  }
  next();
});

//  Dedicated /socket.io CORS handler (Bypasses engine issues)
app.use('/socket.io', (req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.some(allowed => allowed instanceof RegExp ? allowed.test(origin) : allowed === origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-requested-with, ngrok-skip-browser-warning');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ───────────── Socket.IO ─────────────
const io = new Server(server, {
  allowEIO3: true,
  allowUpgrades: true,
  pingTimeout: 60000,
  pingInterval: 25000,
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Bulletproof & Secure CORS: Validate origin before reflecting
io.engine.on("headers", (headers, req) => {
  const origin = req.headers.origin;

  const isAllowed = allowedOrigins.some(allowed => {
    if (allowed instanceof RegExp) return allowed.test(origin);
    return allowed === origin;
  });

  if (origin && isAllowed) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  headers["Access-Control-Allow-Credentials"] = "true";
  headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
  headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, ngrok-skip-browser-warning";
});

export { io };

io.on('connection', (socket) => {
  const { userId, userRole } = socket.handshake.query;
  console.log('Nouveau socket connecte:', socket.id, 'UserId:', userId, 'Role:', userRole);
  console.log('Handshake Query:', socket.handshake.query);

  if (userId) {
    const role = userRole?.toLowerCase();
    if (role === 'municipal_agent' || role === 'municipal agent') {
      socket.join('agents_room');
      console.log(' Municipal Agent rejoint agents_room:', userId);
    } else if (role === 'employee') {
      socket.join(`employee_${userId}`);
      console.log('Employe rejoint room:', `employee_${userId}`);
    }
  }

  socket.on('agent:join', () => {
    socket.join('agents_room');
    socket.role = 'agent';
    console.log(`Agent rejoint agents_room (socket: ${socket.id})`);
  });
  // ── AGENT requests conversation list (React) ──────────────────────────────
  socket.on('chat:get-conversations', async () => {
    try {
      // Fetch latest message per citizen
      const { data: conversations, error } = await supabase
        .from('chat_messages')
        .select(`
          citizen_id,
          users (prenom, nom, email),
          id, from_role, message, created_at, is_read
        `)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Group by citizenId manually since Supabase select is simpler than the previous complex SQL
      const grouped = {};
      conversations.forEach(msg => {
        const cid = msg.citizen_id;
        if (!grouped[cid]) {
          grouped[cid] = {
            citizenId: cid,
            citizenName: `${msg.users.prenom} ${msg.users.nom}`,
            citizenEmail: msg.users.email,
            messages: []
          };
        }
        grouped[cid].messages.push({
          id: msg.id,
          from: msg.from_role,
          text: msg.message,
          time: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          read: msg.is_read
        });
      });

      socket.emit('chat:conversations', Object.values(grouped));
    } catch (err) {
      console.error('chat:get-conversations error:', err.message);
      socket.emit('chat:conversations', []);
    }
  });

  // ── AGENT sends message (React) ───────────────────────────────────────────
  socket.on('chat:send-message', async ({ citizenId, text, time }) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert([{ citizen_id: citizenId, from_role: 'agent', message: text, is_read: true }])
        .select()
        .single();

      if (error) throw error;

      const messageObj = {
        id: data.id,
        from: 'agent',
        text: data.message,
        time: time || new Date(data.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: true,
      };
      // Confirm to the sending agent
      socket.emit('chat:message-sent', {
        citizenId,
        message: messageObj,
      });

      // Send to citizen in Flutter
      io.to(`citizen_${citizenId}`).emit('chat:new-agent-message', {
        message: messageObj,
      });

    } catch (err) {
      console.error('chat:send-message error:', err.message);
    }
  });

  // ── AGENT marks conversation as read (React) ──────────────────────────────
  socket.on('chat:mark-read', async ({ citizenId }) => {
    try {
      await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('citizen_id', citizenId)
        .eq('from_role', 'citizen');

      // Notify all agents to update unread badges
      io.to('agents_room').emit('chat:conversation-read', { citizenId });
    } catch (err) {
      console.error('chat:mark-read error:', err.message);
    }
  });

  // ── CITIZEN joins (Flutter) ───────────────────────────────────────────────
  socket.on('citizen:join', ({ citizenId }) => {
    socket.join(`citizen_${citizenId}`);
    socket.citizenId = citizenId;
    socket.role = 'citizen';
    console.log(`Citoyen rejoint citizen_${citizenId} (socket: ${socket.id})`);
  });

  // ── CITIZEN sends message (Flutter) ──────────────────────────────────────
  socket.on('citizen:send-message', async ({ citizenId, message }) => {
    try {
      // Fetch citizen info
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('nom, prenom, email')
        .eq('id', citizenId)
        .single();

      if (userError) throw userError;

      // Save message
      const { data: saved, error: msgError } = await supabase
        .from('chat_messages')
        .insert([{ citizen_id: citizenId, from_role: 'citizen', message: message }])
        .select()
        .single();

      if (msgError) throw msgError;

      const messageObj = {
        id: saved.id,
        from: 'citizen',
        text: saved.message,
        time: new Date(saved.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: false,
      };

      // Broadcast to all agents (React dashboard)
      io.to('agents_room').emit('chat:new-message', {
        citizenId: citizenId,
        citizenName: `${user.prenom} ${user.nom}`,
        citizenEmail: user.email,
        message: messageObj,
      });

      // Confirm to citizen (Flutter)
      socket.emit('chat:message-sent', { message: messageObj });

    } catch (err) {
      console.error('citizen:send-message error:', err.message);
      socket.emit('chat:error', { error: err.message });
    }
  });
  socket.on('disconnect', () => {
    console.log('Socket déconnecté:', socket.id);
  });
});
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ───────────── Routes ─────────────
app.use('/api/validations', (req, res, next) => {
  console.log(' [ROUTE] /api/validations hit');
  next();
}, validationRoutes);

app.use('/api/notifications', notificationRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/email', emailCertificateRoutes);
app.use('/api', demandeRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Baladiya Digital API — Supabase + Socket.IO' });
});

// ───────────── Start Server ─────────────
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Serveur démarré sur port ${PORT}`);
  console.log(` Socket.IO actif`);
});

server.on('error', (err) => {
  console.error(' Server error:', err);
});