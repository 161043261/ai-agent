import { useCallback, useRef, useState } from 'react';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface UseSSEOptions {
  onMessage?: (data: string) => void;
  onError?: (error: Event) => void;
  onDone?: () => void;
}

export function useSSE(options?: UseSSEOptions) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const eventSourceRef = useRef<EventSource | null>(null);

  const connect = useCallback(
    (createEventSource: () => EventSource) => {
      // 关闭之前的连接
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      setStatus('connecting');
      const eventSource = createEventSource();
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setStatus('connected');
      };

      eventSource.onmessage = (event) => {
        const data = event.data;
        if (data === '[DONE]') {
          setStatus('disconnected');
          eventSource.close();
          options?.onDone?.();
        } else {
          options?.onMessage?.(data);
        }
      };

      eventSource.onerror = (error) => {
        setStatus('error');
        eventSource.close();
        options?.onError?.(error);
      };

      return eventSource;
    },
    [options]
  );

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setStatus('disconnected');
    }
  }, []);

  return {
    status,
    connect,
    disconnect,
  };
}
