import { io, Socket } from 'socket.io-client';
import { BACKEND_URL } from '@/lib/apiBase';

let socket: Socket | null = null;

const SERVER_URL = BACKEND_URL;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(SERVER_URL, {
      autoConnect: false,
      transports: ['polling', 'websocket'], // polling first fixes ngrok WS issues
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