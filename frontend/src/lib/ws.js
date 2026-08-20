// WebSocket helper for live location updates
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export function connectWS(onMessage, onStatus) {
  const wsUrl = BACKEND_URL.replace(/^http/, "ws") + "/api/ws";
  let ws;
  let closed = false;
  let retry = 0;

  const open = () => {
    ws = new WebSocket(wsUrl);
    ws.onopen = () => {
      retry = 0;
      onStatus?.("connected");
    };
    ws.onmessage = (ev) => {
      try {
        onMessage?.(JSON.parse(ev.data));
      } catch (_) {}
    };
    ws.onerror = () => onStatus?.("error");
    ws.onclose = () => {
      onStatus?.("disconnected");
      if (closed) return;
      retry += 1;
      setTimeout(open, Math.min(1000 * retry, 5000));
    };
  };
  open();
  return {
    close: () => {
      closed = true;
      try { ws?.close(); } catch (_) {}
    },
  };
}
