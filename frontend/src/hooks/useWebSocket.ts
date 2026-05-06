import { useEffect, useRef, useState } from 'react';

type WsStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface WebSocketOptions {
  onMessage?: (event: MessageEvent) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  reconnectDelay?: number;
  enabled?: boolean;
}

/**
 * Generic WebSocket hook for real-time updates.
 * Point VITE_WS_URL to your FastAPI WebSocket endpoint.
 *
 * FastAPI expected events:
 *   { type: 'intersection_update', data: Intersection }
 *   { type: 'alert_new', data: Alert }
 *   { type: 'metrics_update', data: MetricsPatch }
 */
export function useWebSocket(path: string, options: WebSocketOptions = {}) {
  const {
    onMessage,
    onConnect,
    onDisconnect,
    reconnectDelay = 3000,
    enabled = true,
  } = options;

  const [status, setStatus] = useState<WsStatus>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!enabled) return;

    const WS_BASE = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8000/ws';
    const url = `${WS_BASE}${path}`;

    function connect() {
      setStatus('connecting');
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('connected');
        onConnect?.();
      };

      ws.onmessage = (e) => {
        onMessage?.(e);
      };

      ws.onclose = () => {
        setStatus('disconnected');
        onDisconnect?.();
        timerRef.current = setTimeout(connect, reconnectDelay);
      };

      ws.onerror = () => {
        setStatus('error');
        ws.close();
      };
    }

    connect();

    return () => {
      clearTimeout(timerRef.current);
      wsRef.current?.close();
    };
  }, [path, enabled, onMessage, onConnect, onDisconnect, reconnectDelay]);

  const send = (data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  };

  return { status, send };
}
