import { api, unwrap } from '../lib/api';
import { normalizeNotification } from '../lib/adapters';

export const notificationService = {
  getNotifications: async (params) => {
    const response = await api.get('/api/notifications', { params });
    const data = unwrap(response);
    const items = Array.isArray(data?.items)
      ? data.items
      : Array.isArray(data?.rows)
        ? data.rows
        : Array.isArray(data?.notifications)
          ? data.notifications
          : Array.isArray(data)
            ? data
            : [];
    return items.map((item) => normalizeNotification({
      ...item,
      title: item.title ?? item.subject ?? '',
      body: item.body ?? item.message ?? '',
      read: item.read ?? item.isRead ?? item.seen ?? item.acknowledged ?? false,
      url: item.url ?? item.redirectUrl ?? null,
      time: item.time ?? item.timeLabel ?? item.createdAtLabel ?? '',
      fullTime: item.fullTime ?? item.createdAt ?? item.timestamp ?? '',
    }));
  },

  markAsRead: async (id) => {
    await api.patch(`/api/notifications/${id}/read`);
  },

  markAllAsRead: async () => {
    await api.patch('/api/notifications/read-all');
  },

  getRegisteredDevices: async () => {
    const response = await api.get('/api/notifications/devices');
    const data = unwrap(response);
    return Array.isArray(data) ? data : (data?.items || []);
  },

  getPublicKey: async () => {
    const response = await api.get('/api/notifications/public-key');
    return unwrap(response);
  },

  registerSubscription: async (subscription, deviceName) => {
    await api.post('/api/notifications/subscribe', { subscription, deviceName });
  },

  unregisterDevice: async (deviceId) => {
    await api.delete(`/api/notifications/devices/${deviceId}`);
  },

  sendBroadcast: async (data) => {
    await api.post('/api/notifications/broadcast', data);
  }
};
