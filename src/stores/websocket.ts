import { ref } from 'vue';
import { defineStore } from 'pinia';
import { usePacketStore } from './packets';
import { useSystemStore } from './system';
import { API_SERVER_URL } from '@/utils/api';
import { getToken, getClientId } from '@/utils/auth';

export const useWebSocketStore = defineStore('websocket', () => {
  const ws = ref<WebSocket | null>(null);
  const isConnected = ref(false);
  const reconnectAttempts = ref(0);
  const pingInterval = ref<number | null>(null);
  const lastPongTime = ref<number>(Date.now());

  const packetStore = usePacketStore();
  const systemStore = useSystemStore();

  function connect() {
    // Prevent multiple connections - check if already connected or connecting
    if (ws.value) {
      if (ws.value.readyState === WebSocket.OPEN) {
        console.log('[WebSocket] Already connected, skipping connect()');
        return;
      } else if (ws.value.readyState === WebSocket.CONNECTING) {
        console.log('[WebSocket] Already connecting, skipping connect()');
        return;
      }
    }

    // In development, connect directly to backend server
    // In production, use same host as the page
    let wsUrl: string;

    const token = getToken();
    const clientId = getClientId();
    const query = new URLSearchParams();
    if (token) query.set('token', token);
    if (clientId) query.set('client_id', clientId);

    if (import.meta.env.DEV) {
      // Development: connect directly to backend
      const devApi = import.meta.env.VITE_DEV_API_URL || 'http://localhost:8000';
      const devWs = devApi.replace(/^http/, 'ws');
      wsUrl = `${devWs}/ws/packets?${query.toString()}`;
    } else {
      // Production: use current location
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = API_SERVER_URL?.trim() ? new URL(API_SERVER_URL).host : window.location.host;
      wsUrl = `${protocol}//${host}/ws/packets?${query.toString()}`;
    }

    console.log('[WebSocket] Creating new connection...');
    ws.value = new WebSocket(wsUrl);

    ws.value.onopen = () => {
      console.log('[WebSocket] Connected');
      isConnected.value = true;
      reconnectAttempts.value = 0;
      lastPongTime.value = Date.now();

      // Start client-side ping interval
      if (pingInterval.value) clearInterval(pingInterval.value);
      pingInterval.value = window.setInterval(() => {
        if (ws.value?.readyState === WebSocket.OPEN) {
          ws.value.send(JSON.stringify({ type: 'ping' }));

          // Check if we haven't received pong in 60s (2x server interval)
          if (Date.now() - lastPongTime.value > 60000) {
            console.warn('[WebSocket] No pong received, reconnecting...');
            disconnect();
            connect();
          }
        }
      }, 30000); // Client ping every 30s
    };

    ws.value.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === 'packet') {
          packetStore.addRealtimePacket(message.data);
        } else if (message.type === 'stats') {
          // Backend sends combined stats message
          if (message.data?.packet_stats) {
            packetStore.updateRealtimeStats({ packet_stats: message.data.packet_stats });
          }
          if (message.data?.system_stats) {
            systemStore.updateRealtimeStats(message.data.system_stats);
          }
        } else if (message.type === 'packet_stats') {
          packetStore.updateRealtimeStats(message.data);
        } else if (message.type === 'system_stats') {
          systemStore.updateRealtimeStats(message.data);
        } else if (message.type === 'pong' || message.type === 'ping') {
          // Update last pong time on any server heartbeat
          lastPongTime.value = Date.now();

          // Respond to server pings
          if (message.type === 'ping' && ws.value?.readyState === WebSocket.OPEN) {
            ws.value.send(JSON.stringify({ type: 'pong' }));
          }
        }
      } catch (error) {
        console.error('[WebSocket] Parse error:', error);
      }
    };

    ws.value.onerror = () => {
      console.log('[WebSocket] Error');
      isConnected.value = false;
      ws.value = null;

      // Clear ping interval
      if (pingInterval.value) {
        clearInterval(pingInterval.value);
        pingInterval.value = null;
      }

      // Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
      if (reconnectAttempts.value < 5) {
        // Reduced from 20 to 5 for testing
        const delay = Math.min(1000 * Math.pow(2, Math.min(reconnectAttempts.value, 5)), 30000);
        console.log(
          `[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.value + 1})`,
        );
        reconnectAttempts.value++;
        setTimeout(connect, delay);
      } else {
        console.error('[WebSocket] Max reconnection attempts reached - stopping');
      }
    };

    ws.value.onclose = () => {
      console.log('[WebSocket] Disconnected');
      isConnected.value = false;
      ws.value = null;

      // Clear ping interval
      if (pingInterval.value) {
        clearInterval(pingInterval.value);
        pingInterval.value = null;
      }

      // Only auto-reconnect if we haven't hit max attempts
      if (reconnectAttempts.value < 5) {
        reconnectAttempts.value = 0;
        setTimeout(connect, 3000);
      } else {
        console.log('[WebSocket] Not reconnecting - max attempts reached');
      }
    };
  }

  function disconnect() {
    console.log('[WebSocket] Disconnecting...');

    // Clear ping interval
    if (pingInterval.value) {
      clearInterval(pingInterval.value);
      pingInterval.value = null;
    }

    // Close the connection
    if (ws.value) {
      // Remove event handlers to prevent reconnection
      ws.value.onclose = null;
      ws.value.onerror = null;
      ws.value.close();
      ws.value = null;
    }

    isConnected.value = false;
    reconnectAttempts.value = 0;
  }

  return { isConnected, connect, disconnect };
});
