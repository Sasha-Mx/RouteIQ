import { generateNudge, evaluateReplan } from './agents.js';

const sessions = new Map();

export function createSession(sessionId, route) {
  sessions.set(sessionId, {
    route,
    clients: [],
    started: Date.now(),
    lastBusEta: null,
    nudgeSent: false,
    replanSent: false,
    intervalId: null
  });
  return sessionId;
}

export function addClient(sessionId, res) {
  const session = sessions.get(sessionId);
  if (!session) return;
  session.clients.push(res);
}

export function removeClient(sessionId, res) {
  const session = sessions.get(sessionId);
  if (!session) return;
  session.clients = session.clients.filter(c => c !== res);
}

function emit(session, event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  session.clients.forEach(res => {
    try { res.write(payload); } catch {}
  });
}

export function startMonitoring(sessionId) {
  const session = sessions.get(sessionId);
  if (!session || session.intervalId) return;

  let tick = 0;
  session.intervalId = setInterval(async () => {
    tick++;
    const session = sessions.get(sessionId);
    if (!session || session.clients.length === 0) return;

    // ── Tick 3 (~45s): NudgeCommander Agent generates alert ──
    if (tick === 3 && !session.nudgeSent) {
      session.nudgeSent = true;
      const busNum = session.route.busNumber || '534';
      const nudgeResult = await generateNudge(busNum, 3, 23, session.route.destination || 'destination');

      emit(session, 'nudge', {
        message: nudgeResult.text,
        busNumber: busNum,
        minsAway: 3,
        nextBusMins: 23,
        agent: { name: nudgeResult.agent, model: nudgeResult.model, ms: nudgeResult.ms }
      });
    }

    // ── Tick 6 (~90s): ReplanStrategist Agent evaluates disruption ──
    if (tick === 6 && !session.replanSent) {
      session.replanSent = true;
      const disruption = {
        type: 'Traffic delay',
        description: `Bus ${session.route.busNumber || '534'} running late due to traffic at ITO`,
        delayMinutes: 8,
        savedMinutes: 9
      };

      const replanResult = await evaluateReplan(session.route, disruption);
      const replanData = replanResult.data;

      if (replanData?.shouldReplan !== false) {
        emit(session, 'replan', {
          reason: replanData?.reason || disruption.description,
          urgency: replanData?.urgency || 'medium',
          action: replanData?.action || 'Consider switching routes.',
          currentMinutes: session.route.totalMinutes || 52,
          newMinutes: (session.route.totalMinutes || 52) - 9,
          savedMinutes: 9,
          newRoute: {
            label: 'Alternative',
            totalMinutes: (session.route.totalMinutes || 52) - 9,
            costEstimate: (session.route.costEstimate || 28) + 5,
            legs: session.route.legs || []
          },
          agent: { name: replanResult.agent, model: replanResult.model, ms: replanResult.ms }
        });
      }
    }

    // Heartbeat
    emit(session, 'heartbeat', { tick, time: new Date().toISOString() });
  }, 15000);
}

export function stopMonitoring(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return;
  if (session.intervalId) clearInterval(session.intervalId);
  sessions.delete(sessionId);
}

export function getActiveSessions() {
  return [...sessions.keys()];
}
