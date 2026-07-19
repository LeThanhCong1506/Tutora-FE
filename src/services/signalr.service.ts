/* eslint-disable @typescript-eslint/no-explicit-any */
import * as signalR from '@microsoft/signalr';
import { getCurrentUser } from './auth.service';
import { registerSessionCleanup } from './sessionLifecycle.service';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5166';
const HUB_URL = `${API_BASE_URL}/hubs/chat`;
const NOTIFICATION_HUB_URL = `${API_BASE_URL}/notificationHub`;
const CONNECTION_RETRY_DELAYS = [1_000, 2_000, 5_000, 10_000, 30_000] as const;
const PRESENCE_HEARTBEAT_INTERVAL_MS = 25_000;

export type ConnectionLifecycle = 'connected' | 'reconnecting' | 'reconnected' | 'disconnected';
export type ChatConnectionLifecycle = ConnectionLifecycle;
export type NotificationConnectionLifecycle = ConnectionLifecycle;

// Debug log chỉ chạy ở local dev; production build (import.meta.env.DEV === false)
// sẽ tree-shake block này khỏi bundle để giữ console im lặng.
if (import.meta.env.DEV) {
  console.log('🔌 SignalR Config:');
  console.log('  - API_BASE_URL:', API_BASE_URL);
  console.log('  - Chat HUB_URL:', HUB_URL);
  console.log('  - Notification HUB_URL:', NOTIFICATION_HUB_URL);
}

class SignalRService {
  // Chat hub connection
  private connection: signalR.HubConnection | null = null;
  private startPromise: Promise<void> | null = null;

  // Notification hub connection (riêng biệt)
  private notificationConnection: signalR.HubConnection | null = null;
  private notificationStartPromise: Promise<void> | null = null;

  private messageHandlers: Map<string, (message: any) => void> = new Map();
  private notificationHandlers: Map<string, (data: any) => void> = new Map();

  // Multi-subscriber sets — cho các sidebar badge / global listener cần co-exist với
  // ChatArea (vốn dùng single-slot `onMessageReceived`). Khi message tới, cả handler
  // ở `messageHandlers` (ChatArea) lẫn mọi subscriber ở đây đều được gọi.
  private chatMessageSubscribers: Set<(message: any) => void> = new Set();
  private notificationSubscribers: Set<(notification: any) => void> = new Set();
  private presenceSubscribers: Set<(presence: unknown) => void> = new Set();
  private chatLifecycleSubscribers: Set<(state: ChatConnectionLifecycle) => void> = new Set();
  private notificationLifecycleSubscribers: Set<(state: NotificationConnectionLifecycle) => void> = new Set();

  private chatRetryTimer: ReturnType<typeof setTimeout> | null = null;
  private notificationRetryTimer: ReturnType<typeof setTimeout> | null = null;
  private presenceHeartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private chatRetryAttempt = 0;
  private notificationRetryAttempt = 0;
  private shouldReconnect = true;

  constructor() {
    registerSessionCleanup(() => this.disconnect());

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        if (!this.shouldReconnect) return;
        void this.connect().catch(() => {
          // connectNotification schedules its own bounded backoff.
        });
      });
    }
  }

  // ==================== CONNECT / DISCONNECT ====================

  async connect(): Promise<void> {
    const user = getCurrentUser();
    const token = user?.accessToken || import.meta.env.VITE_TOKEN;

    if (!token) {
      console.error('❌ SignalR: No access token available');
      throw new Error('No access token available');
    }

    this.shouldReconnect = true;

    // Connect cả 2 hub song song
    const [chatResult] = await Promise.allSettled([this.connectChat(), this.connectNotification()]);

    // Notification/presence has an independent retry loop, but chat callers need to know
    // when the chat hub itself could not be established.
    if (chatResult.status === 'rejected') throw chatResult.reason;
  }

  private async connectChat(): Promise<void> {
    if (this.startPromise) return this.startPromise;

    if (
      this.connection &&
      (this.connection.state === signalR.HubConnectionState.Connected ||
        this.connection.state === signalR.HubConnectionState.Connecting ||
        this.connection.state === signalR.HubConnectionState.Reconnecting)
    ) {
      console.log('✅ Chat SignalR: Already connected, state:', this.connection.state);
      return Promise.resolve();
    }

    console.log('🔗 Chat SignalR: Starting connection...');

    if (!this.connection) {
      this.connection = new signalR.HubConnectionBuilder()
        .withUrl(HUB_URL, {
          accessTokenFactory: () => {
            const currentUser = getCurrentUser();
            return currentUser?.accessToken || import.meta.env.VITE_TOKEN || '';
          },
        })
        .withAutomaticReconnect()
        .configureLogging(signalR.LogLevel.Warning)
        .build();

      this.setupChatHandlers();
    }

    const connection = this.connection;
    this.startPromise = connection
      .start()
      .then(async () => {
        if (this.connection !== connection || !this.shouldReconnect) {
          await connection.stop();
          return;
        }
        console.log('✅ Chat SignalR Connected', this.connection?.connectionId);
        this.startPromise = null;
        this.chatRetryAttempt = 0;
        this.clearChatRetry();
        this.emitChatLifecycle('connected');
      })
      .catch((err: any) => {
        if (this.connection === connection) this.startPromise = null;
        if (err.name === 'AbortError') {
          console.warn('⚠️ Chat SignalR aborted (common in React StrictMode)');
        } else {
          console.error('❌ Chat SignalR Connection failed:', err);
        }
        if (this.connection === connection && this.shouldReconnect) {
          this.emitChatLifecycle('disconnected');
          this.scheduleChatRetry();
        }
        throw err;
      });

    return this.startPromise;
  }

  private async connectNotification(): Promise<void> {
    if (this.notificationStartPromise) return this.notificationStartPromise;

    if (
      this.notificationConnection &&
      (this.notificationConnection.state === signalR.HubConnectionState.Connected ||
        this.notificationConnection.state === signalR.HubConnectionState.Connecting ||
        this.notificationConnection.state === signalR.HubConnectionState.Reconnecting)
    ) {
      console.log('✅ Notification SignalR: Already connected');
      return Promise.resolve();
    }

    console.log('🔗 Notification SignalR: Starting connection...');

    if (!this.notificationConnection) {
      this.notificationConnection = new signalR.HubConnectionBuilder()
        .withUrl(NOTIFICATION_HUB_URL, {
          accessTokenFactory: () => {
            const currentUser = getCurrentUser();
            return currentUser?.accessToken || import.meta.env.VITE_TOKEN || '';
          },
        })
        .withAutomaticReconnect()
        .configureLogging(signalR.LogLevel.Warning)
        .build();

      this.setupNotificationHandlers();
    }

    const connection = this.notificationConnection;
    this.notificationStartPromise = connection
      .start()
      .then(async () => {
        if (this.notificationConnection !== connection || !this.shouldReconnect) {
          await connection.stop();
          return;
        }
        console.log('✅ Notification SignalR Connected', this.notificationConnection?.connectionId);
        this.notificationStartPromise = null;
        this.notificationRetryAttempt = 0;
        this.clearNotificationRetry();
        this.startPresenceHeartbeat();
        this.emitNotificationLifecycle('connected');
        // Handler dispatch qua các wrapper cố định trong setupNotificationHandlers (đọc
        // notificationHandlers + notificationSubscribers), nên KHÔNG cần re-register thủ
        // công ở đây — làm vậy sẽ gỡ mất các wrapper đó.
      })
      .catch((err: any) => {
        if (this.notificationConnection === connection) this.notificationStartPromise = null;
        if (err.name === 'AbortError') {
          console.warn('⚠️ Notification SignalR aborted (common in React StrictMode)');
        } else {
          console.error('❌ Notification SignalR Connection failed:', err);
        }
        if (this.notificationConnection === connection && this.shouldReconnect) {
          this.emitNotificationLifecycle('disconnected');
          this.scheduleNotificationRetry();
        }
        throw err;
      });

    return this.notificationStartPromise;
  }

  async disconnect(): Promise<void> {
    this.shouldReconnect = false;
    this.clearChatRetry();
    this.clearNotificationRetry();
    this.stopPresenceHeartbeat();

    const chatConnection = this.connection;
    const notificationConnection = this.notificationConnection;
    this.connection = null;
    this.notificationConnection = null;
    this.startPromise = null;
    this.notificationStartPromise = null;

    await Promise.allSettled([
      chatConnection?.stop() ?? Promise.resolve(),
      notificationConnection?.stop() ?? Promise.resolve(),
    ]);

    if (chatConnection) console.log('🔌 Chat SignalR Disconnected');
    if (notificationConnection) console.log('🔌 Notification SignalR Disconnected');
    this.emitChatLifecycle('disconnected');
    this.emitNotificationLifecycle('disconnected');
  }

  isConnected(): boolean {
    return this.connection?.state === signalR.HubConnectionState.Connected;
  }

  getState(): signalR.HubConnectionState {
    return this.connection?.state ?? signalR.HubConnectionState.Disconnected;
  }

  // ==================== CHAT METHODS ====================

  async joinChannel(channelId: number): Promise<void> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      console.error('❌ SignalR: Cannot join channel - connection not ready');
      throw new Error('SignalR connection not established');
    }
    try {
      await this.connection.invoke('JoinChannel', channelId);
      console.log(`✅ Joined channel ${channelId}`);
    } catch (err) {
      console.error(`❌ Error joining channel ${channelId}:`, err);
      throw err;
    }
  }

  async leaveChannel(channelId: number): Promise<void> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      console.error('❌ SignalR: Cannot leave channel - connection not ready');
      throw new Error('SignalR connection not established');
    }
    try {
      await this.connection.invoke('LeaveChannel', channelId);
      console.log(`✅ Left channel ${channelId}`);
    } catch (err) {
      console.error(`❌ Error leaving channel ${channelId}:`, err);
      throw err;
    }
  }

  async sendMessage(channelId: number, content: string): Promise<void> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      console.error('❌ SignalR: Cannot send message - connection not ready');
      throw new Error('SignalR connection not established');
    }
    try {
      await this.connection.invoke('SendMessage', channelId, content);
      console.log(`✅ Sent message to channel ${channelId}:`, content);
    } catch (err) {
      console.error('❌ Error sending message:', err);
      throw err;
    }
  }

  async typing(channelId: number): Promise<void> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) return;
    try {
      await this.connection.invoke('Typing', channelId);
    } catch (err) {
      console.error('❌ Error sending typing:', err);
    }
  }

  async stopTyping(channelId: number): Promise<void> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) return;
    try {
      await this.connection.invoke('StopTyping', channelId);
    } catch (err) {
      console.error('❌ Error sending stopTyping:', err);
    }
  }

  // ==================== NOTIFICATION METHODS ====================

  onNotificationReceived(handler: (notification: any) => void): void {
    // Map-only — wrapper trong setupNotificationHandlers dispatch từ map này VÀ fan-out
    // tới subscribeToNotifications. Gọi connection.off/on ở đây sẽ gỡ wrapper đó và giết
    // mọi notification subscriber (badge theo tab, listener "Buổi học đã bắt đầu").
    this.notificationHandlers.set('ReceiveNotification', handler);
  }

  offNotificationReceived(): void {
    this.notificationHandlers.delete('ReceiveNotification');
  }

  /**
   * Multi-subscriber API cho notifications — dùng khi page-level hook cần lắng nghe
   * notification cụ thể (vd. "Buổi học đã bắt đầu" để refresh lesson) mà không
   * clobber single-slot handler đang được Layout dùng cho global toast/badge.
   *
   * Trả về cleanup function — gọi để unsubscribe.
   */
  subscribeToNotifications(handler: (notification: any) => void): () => void {
    this.notificationSubscribers.add(handler);
    return () => {
      this.notificationSubscribers.delete(handler);
    };
  }

  /**
   * Multi-subscriber cho sự kiện presence "presenceChanged" — một đối tác chat vừa
   * online/offline. Payload: { userId, isOnline, lastSeenAt }. Trả về cleanup function.
   */
  subscribeToPresence(handler: (presence: unknown) => void): () => void {
    this.presenceSubscribers.add(handler);
    return () => {
      this.presenceSubscribers.delete(handler);
    };
  }

  subscribeToChatLifecycle(handler: (state: ChatConnectionLifecycle) => void): () => void {
    this.chatLifecycleSubscribers.add(handler);
    return () => {
      this.chatLifecycleSubscribers.delete(handler);
    };
  }

  /**
   * Connection lifecycle for consumers that must revalidate state after missed events.
   */
  subscribeToNotificationLifecycle(handler: (state: NotificationConnectionLifecycle) => void): () => void {
    this.notificationLifecycleSubscribers.add(handler);
    return () => {
      this.notificationLifecycleSubscribers.delete(handler);
    };
  }

  isNotificationConnected(): boolean {
    return this.notificationConnection?.state === signalR.HubConnectionState.Connected;
  }

  onNotificationCountUpdated(handler: (count: number) => void): void {
    this.notificationHandlers.set('NotificationCountUpdated', handler);
  }

  offNotificationCountUpdated(): void {
    this.notificationHandlers.delete('NotificationCountUpdated');
  }

  async markNotificationAsRead(notificationId: number): Promise<void> {
    if (!this.notificationConnection || this.notificationConnection.state !== signalR.HubConnectionState.Connected)
      return;
    try {
      await this.notificationConnection.invoke('MarkNotificationAsRead', notificationId);
    } catch (err) {
      console.error('❌ Error marking notification as read via hub:', err);
    }
  }

  // ==================== CHAT EVENT LISTENERS ====================

  onMessageReceived(handler: (message: any) => void): void {
    this.addOrUpdateChatHandler('messageReceived', handler);
  }

  offMessageReceived(): void {
    this.removeChatHandler('messageReceived');
  }

  /**
   * Multi-subscriber API cho chat messages — dùng khi có ≥2 component cùng cần
   * lắng nghe message tới (vd. sidebar badge ở Layout + ChatArea ở page).
   *
   * Trả về cleanup function — gọi để unsubscribe. Khác với `onMessageReceived`
   * (single-slot, register thứ 2 ghi đè thứ 1), mỗi subscriber ở đây giữ nguyên
   * khi có subscriber khác đăng ký.
   */
  subscribeToChatMessages(handler: (message: any) => void): () => void {
    this.chatMessageSubscribers.add(handler);
    return () => {
      this.chatMessageSubscribers.delete(handler);
    };
  }

  onUserJoined(handler: (data: any) => void): void {
    this.addOrUpdateChatHandler('userJoined', handler);
  }

  offUserJoined(): void {
    this.removeChatHandler('userJoined');
  }

  onUserLeft(handler: (data: any) => void): void {
    this.addOrUpdateChatHandler('userLeft', handler);
  }

  offUserLeft(): void {
    this.removeChatHandler('userLeft');
  }

  onUserTyping(handler: (data: any) => void): void {
    this.addOrUpdateChatHandler('userTyping', handler);
  }

  offUserTyping(): void {
    this.removeChatHandler('userTyping');
  }

  onUserStoppedTyping(handler: (data: any) => void): void {
    this.addOrUpdateChatHandler('userStoppedTyping', handler);
  }

  offUserStoppedTyping(): void {
    this.removeChatHandler('userStoppedTyping');
  }

  // ==================== PRIVATE HELPERS ====================

  private addOrUpdateChatHandler(eventName: string, handler: (message: any) => void): void {
    // Chỉ update map — dispatch do các wrapper cố định đăng ký MỘT LẦN trong
    // setupChatHandlers đảm nhiệm (chúng đọc map này tại thời điểm sự kiện). TUYỆT ĐỐI
    // không gọi connection.off/on ở đây: connection.off(eventName) sẽ gỡ luôn wrapper,
    // phá vỡ fan-out multi-subscriber (subscribeToChatMessages → badge tin nhắn) cho
    // toàn app cho tới khi reconnect hẳn.
    this.messageHandlers.set(eventName, handler);
  }

  private removeChatHandler(eventName: string): void {
    this.messageHandlers.delete(eventName);
  }

  private setupChatHandlers(): void {
    if (!this.connection) return;
    const connection = this.connection;

    connection.on('messageReceived', (message: any) => {
      if (this.connection !== connection) return;
      console.log('📩 Chat messageReceived:', message);
      const handler = this.messageHandlers.get('messageReceived');
      if (handler) handler(message);
      // Notify multi-subscribers (sidebar badge, global toast, ...)
      this.chatMessageSubscribers.forEach((fn) => {
        try {
          fn(message);
        } catch (err) {
          console.error('chat subscriber failed:', err);
        }
      });
    });

    connection.on('userJoined', (data: any) => {
      if (this.connection !== connection) return;
      console.log('👤 Chat userJoined:', data);
      const handler = this.messageHandlers.get('userJoined');
      if (handler) handler(data);
    });

    connection.on('userLeft', (data: any) => {
      if (this.connection !== connection) return;
      console.log('👋 Chat userLeft:', data);
      const handler = this.messageHandlers.get('userLeft');
      if (handler) handler(data);
    });

    connection.on('userTyping', (data: any) => {
      if (this.connection !== connection) return;
      const handler = this.messageHandlers.get('userTyping');
      if (handler) handler(data);
    });

    connection.on('userStoppedTyping', (data: any) => {
      if (this.connection !== connection) return;
      const handler = this.messageHandlers.get('userStoppedTyping');
      if (handler) handler(data);
    });

    connection.onreconnecting((error?: Error) => {
      if (this.connection !== connection) return;
      console.log('🔄 Chat SignalR Reconnecting...', error);
      this.emitChatLifecycle('reconnecting');
    });

    connection.onreconnected((connectionId?: string) => {
      if (this.connection !== connection) return;
      console.log('✅ Chat SignalR Reconnected', connectionId);
      this.chatRetryAttempt = 0;
      this.clearChatRetry();
      this.emitChatLifecycle('reconnected');
    });

    connection.onclose((error?: Error) => {
      if (this.connection !== connection) return;
      console.log('❌ Chat SignalR Closed', error);
      this.emitChatLifecycle('disconnected');
      this.scheduleChatRetry();
    });
  }

  private setupNotificationHandlers(): void {
    if (!this.notificationConnection) return;
    const connection = this.notificationConnection;

    connection.on('ReceiveNotification', (notification: any) => {
      if (this.notificationConnection !== connection) return;
      console.log('🔔 Notification received:', notification);
      const handler = this.notificationHandlers.get('ReceiveNotification');
      if (handler) handler(notification);
      // Notify multi-subscribers (page-level lesson listener, ...)
      this.notificationSubscribers.forEach((fn) => {
        try {
          fn(notification);
        } catch (err) {
          console.error('notification subscriber failed:', err);
        }
      });
    });

    connection.on('NotificationCountUpdated', (count: number) => {
      if (this.notificationConnection !== connection) return;
      console.log('📬 Notification count updated:', count);
      const handler = this.notificationHandlers.get('NotificationCountUpdated');
      if (handler) handler(count);
    });

    connection.on('NotificationMarkedAsRead', (notificationId: number) => {
      if (this.notificationConnection !== connection) return;
      console.log('✅ Notification marked as read:', notificationId);
    });

    connection.on('presenceChanged', (presence: unknown) => {
      if (this.notificationConnection !== connection) return;
      this.presenceSubscribers.forEach((fn) => {
        try {
          fn(presence);
        } catch (err) {
          console.error('presence subscriber failed:', err);
        }
      });
    });

    connection.onreconnecting((error?: Error) => {
      if (this.notificationConnection !== connection) return;
      console.log('🔄 Notification SignalR Reconnecting...', error);
      this.stopPresenceHeartbeat();
      this.emitNotificationLifecycle('reconnecting');
    });

    connection.onreconnected((connectionId?: string) => {
      if (this.notificationConnection !== connection) return;
      console.log('✅ Notification SignalR Reconnected', connectionId);
      this.notificationRetryAttempt = 0;
      this.clearNotificationRetry();
      this.startPresenceHeartbeat();
      this.emitNotificationLifecycle('reconnected');
      // Wrapper + handler map sống sót qua reconnect (cùng một connection object), nên
      // không cần re-register thủ công.
    });

    connection.onclose((error?: Error) => {
      if (this.notificationConnection !== connection) return;
      console.log('❌ Notification SignalR Closed', error);
      this.stopPresenceHeartbeat();
      this.emitNotificationLifecycle('disconnected');
      this.scheduleNotificationRetry();
    });
  }

  private emitNotificationLifecycle(state: NotificationConnectionLifecycle): void {
    this.notificationLifecycleSubscribers.forEach((handler) => {
      try {
        handler(state);
      } catch (error) {
        console.error('notification lifecycle subscriber failed:', error);
      }
    });
  }

  private emitChatLifecycle(state: ChatConnectionLifecycle): void {
    this.chatLifecycleSubscribers.forEach((handler) => {
      try {
        handler(state);
      } catch (error) {
        console.error('chat lifecycle subscriber failed:', error);
      }
    });
  }

  private clearChatRetry(): void {
    if (!this.chatRetryTimer) return;
    clearTimeout(this.chatRetryTimer);
    this.chatRetryTimer = null;
  }

  private clearNotificationRetry(): void {
    if (!this.notificationRetryTimer) return;
    clearTimeout(this.notificationRetryTimer);
    this.notificationRetryTimer = null;
  }

  private scheduleNotificationRetry(): void {
    if (!this.shouldReconnect || this.notificationRetryTimer) return;

    const delay = CONNECTION_RETRY_DELAYS[Math.min(this.notificationRetryAttempt, CONNECTION_RETRY_DELAYS.length - 1)];
    this.notificationRetryAttempt += 1;

    this.notificationRetryTimer = setTimeout(() => {
      this.notificationRetryTimer = null;
      if (!this.shouldReconnect) return;

      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        this.scheduleNotificationRetry();
        return;
      }

      void this.connectNotification().catch(() => {
        // connectNotification schedules the next attempt.
      });
    }, delay);
  }

  private scheduleChatRetry(): void {
    if (!this.shouldReconnect || this.chatRetryTimer) return;

    const delay = CONNECTION_RETRY_DELAYS[Math.min(this.chatRetryAttempt, CONNECTION_RETRY_DELAYS.length - 1)];
    this.chatRetryAttempt += 1;

    this.chatRetryTimer = setTimeout(() => {
      this.chatRetryTimer = null;
      if (!this.shouldReconnect) return;

      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        this.scheduleChatRetry();
        return;
      }

      void this.connectChat().catch(() => {
        // connectChat schedules the next attempt.
      });
    }, delay);
  }

  private startPresenceHeartbeat(): void {
    this.stopPresenceHeartbeat();
    void this.sendPresenceHeartbeat();
    this.presenceHeartbeatTimer = setInterval(() => {
      void this.sendPresenceHeartbeat();
    }, PRESENCE_HEARTBEAT_INTERVAL_MS);
  }

  private stopPresenceHeartbeat(): void {
    if (!this.presenceHeartbeatTimer) return;
    clearInterval(this.presenceHeartbeatTimer);
    this.presenceHeartbeatTimer = null;
  }

  private async sendPresenceHeartbeat(): Promise<void> {
    const connection = this.notificationConnection;
    if (!connection || connection.state !== signalR.HubConnectionState.Connected) return;

    try {
      await connection.invoke('PresenceHeartbeat');
    } catch (error) {
      console.warn('Notification presence heartbeat failed:', error);
    }
  }
}

// Export singleton instance
export const signalRService = new SignalRService();
