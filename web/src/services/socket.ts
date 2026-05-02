import { io, Socket } from 'socket.io-client';
import { BACKEND_URL } from '@/lib/apiBase';

let socket: Socket | null = null;

const SERVER_URL = 'http://localhost:5000';

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(SERVER_URL, {
      autoConnect: false,
      transports: ['polling', 'websocket'],
      withCredentials: true,
      path: '/socket.io/',
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000
    });

    socket.on('connect', () => {
      console.log('✅ Socket.IO connected successfully!', socket?.id);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Socket.IO connection error:', error.message);
    });

    socket.on('disconnect', (reason) => {
      console.log('⚠️ Socket.IO disconnected:', reason);
    });
  }
  return socket;
};

// Call this once when the agent logs in
export const connectSocket = (): Socket => {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};