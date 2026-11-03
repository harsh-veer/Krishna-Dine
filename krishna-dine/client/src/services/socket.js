import { io } from 'socket.io-client';
import { SOCKET_URL } from './config';

/** Creates a Socket.IO connection. Staff pass their JWT; customers connect as guests. */
export function createSocket({ token } = {}) {
  return io(SOCKET_URL, {
    auth: token ? { token } : {},
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 8000,
    withCredentials: true,
  });
}

export const ORDER_EVENTS = ['new-order', 'order-accepted', 'order-preparing', 'order-ready', 'order-served', 'order-cancelled', 'order-updated'];
