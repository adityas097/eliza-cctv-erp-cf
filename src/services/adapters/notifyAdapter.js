// Notification & Push Adapter (FCM / Web Push + Local In-App Banner)

export class NotifyAdapter {
  async send(targetUser, payload) { throw new Error('Not implemented'); }
  async registerPushToken(token) { throw new Error('Not implemented'); }
}

export class InAppNotifyAdapter extends NotifyAdapter {
  constructor() {
    super();
    this.queue = [];
  }

  async send(targetUser, payload) {
    const entry = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      targetUser,
      title: payload.title || 'Notification',
      message: payload.message || '',
      type: payload.type || 'info',
      timestamp: new Date().toISOString()
    };
    this.queue.unshift(entry);
    return { success: true, notification: entry };
  }

  async registerPushToken(token) {
    return { success: true, token };
  }
}

export const notifyAdapter = new InAppNotifyAdapter();
