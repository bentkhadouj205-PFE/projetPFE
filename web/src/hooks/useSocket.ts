import { useEffect, useState, useRef } from 'react';
import io, { Socket } from 'socket.io-client';
import { API_BASE_URL } from '@/lib/apiBase';

const socketBaseUrl = 'http://localhost:5000';

export const useSocket = (userId: string, userRole: string) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!userId || socketRef.current) return;

    socketRef.current = io(socketBaseUrl, {
      query: { userId, userRole },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current.on('connect', () => {
      console.log('Socket connected!', socketRef.current?.id);
    });

    socketRef.current.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    socketRef.current.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });

    socketRef.current.on('new-notification', (notification) => {
      console.log('New notification:', notification);
      setNotifications(prev => [notification, ...prev]);
    });

    return () => {
      // Only disconnect on actual app unmount, not React StrictMode remounts
      // if (socketRef.current) {
      //   socketRef.current.disconnect();
      //   socketRef.current = null;
      // }
    };
  }, [userId, userRole]);

  const sendNotification = (data: any) => {
    if (socketRef.current) {
      socketRef.current.emit('send-notification', data);
    }
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  return { socket: socketRef.current, notifications, sendNotification, clearNotifications };
};