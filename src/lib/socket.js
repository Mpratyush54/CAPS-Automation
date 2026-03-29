import { io } from 'socket.io-client';
import { getDeviceFingerprint } from './device';

const SOCKET_URL = import.meta.env.VITE_API_URL || '';

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  withCredentials: true,
  transports: ['websocket', 'polling']
});

/**
 * Initialize socket connection for the authenticated user
 * @param {string} userId
 */
export const initSocket = (userId) => {
  if (!userId) return;
  socket.auth = { 
    userId,
    fingerprint: getDeviceFingerprint()
  };
  socket.connect();
};

/**
 * Terminate socket connection
 */
export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};
