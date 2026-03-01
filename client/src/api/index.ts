const SERVER_URL = "http://localhost:8081/api";

export function chatWithSse(
  memoryId: number,
  message: string,
  onMessage: (chunk: string) => void,
  onError: (err: unknown) => void,
  onClose: () => void,
) {
  const params = new URLSearchParams({
    memoryId: String(memoryId),
    message,
  });
  // const eventSource = new EventSource(
  //   `${SERVER_URL}/ai/chat?memoryId=${memoryId}&message=${message}`,
  // );
  const eventSource = new EventSource(`${SERVER_URL}/ai/chat?${params}`);
  eventSource.onmessage = function (event: MessageEvent) {
    try {
      const { data } = event;
      if (data && String(data).trim()) {
        onMessage(String(data).trim());
      }
    } catch (err) {
      console.error(err);
      onError(err);
    }
  };
  eventSource.onerror = function (err: unknown) {
    if (eventSource.readyState !== EventSource.CLOSED) {
      eventSource.close();
      onError(err);
    } else {
      // SSE 连接正常关闭
      onClose();
    }
  };
  return eventSource;
}
