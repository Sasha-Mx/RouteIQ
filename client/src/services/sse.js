let eventSource = null;
const listeners = {};

export function connectSSE(sessionId, routeData) {
  if (eventSource) eventSource.close();
  const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const routeParam = encodeURIComponent(JSON.stringify(routeData || {}));
  const url = `${BASE}/api/monitor?sessionId=${sessionId}&route=${routeParam}`;
  eventSource = new EventSource(url);

  ['connected', 'nudge', 'replan', 'heartbeat'].forEach(evt => {
    eventSource.addEventListener(evt, (e) => {
      try {
        const data = JSON.parse(e.data);
        (listeners[evt] || []).forEach(fn => fn(data));
      } catch {}
    });
  });

  eventSource.onerror = () => {
    (listeners['error'] || []).forEach(fn => fn());
  };

  return eventSource;
}

export function onSSEEvent(event, fn) {
  if (!listeners[event]) listeners[event] = [];
  listeners[event].push(fn);
  return () => { 
    if (listeners[event]) {
      listeners[event] = listeners[event].filter(f => f !== fn); 
    }
  };
}

export function disconnectSSE() {
  if (eventSource) { eventSource.close(); eventSource = null; }
  Object.keys(listeners).forEach(k => delete listeners[k]);
}
