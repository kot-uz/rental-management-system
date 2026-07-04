import type { Middleware } from '@reduxjs/toolkit';
import { io, Socket } from 'socket.io-client';
import { notificationsApi } from '../../entities/notifications/api/notificationsApi';
import type { AppDispatch } from './index';

/**
 * Keeps a Socket.IO connection to the backend `/notifications` namespace in
 * sync with auth state: connects once a token is present, disconnects on
 * logout. Incoming realtime events invalidate the Notification cache so the
 * bell and lists refetch live. Reconciles on every action, so a persisted
 * session (page reload) reconnects on the first dispatched action.
 */
let socket: Socket | null = null;

function connect(token: string, dispatch: AppDispatch): void {
  socket = io('/notifications', {
    auth: { token },
    // Reconnect automatically; the proxy forwards both polling and websocket.
    reconnectionAttempts: 5,
  });

  const invalidate = (): void => {
    dispatch(notificationsApi.util.invalidateTags(['Notification']));
  };

  socket.on('notification:new', invalidate);
  socket.on('notifications:updated', invalidate);
}

function disconnect(): void {
  socket?.removeAllListeners();
  socket?.disconnect();
  socket = null;
}

export const socketMiddleware: Middleware = (store) => (next) => (action) => {
  const result = next(action);

  const token = (store.getState() as { auth: { accessToken: string | null } }).auth.accessToken;
  if (token && !socket) {
    connect(token, store.dispatch);
  } else if (!token && socket) {
    disconnect();
  }

  return result;
};
