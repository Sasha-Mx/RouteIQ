import { Router } from 'express';
import { createSession, addClient, removeClient, startMonitoring, stopMonitoring } from '../services/monitor.js';

const router = Router();

router.get('/', (req, res) => {
  const sessionId = req.query.sessionId || `session_${Date.now()}`;
  const routeData = req.query.route ? JSON.parse(decodeURIComponent(req.query.route)) : { busNumber: '534', totalMinutes: 52, costEstimate: 28, legs: [] };

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  createSession(sessionId, routeData);
  addClient(sessionId, res);
  startMonitoring(sessionId);

  // Send initial connection event
  res.write(`event: connected\ndata: ${JSON.stringify({ sessionId, message: 'Journey monitoring started' })}\n\n`);

  req.on('close', () => {
    removeClient(sessionId, res);
  });
});

router.delete('/:sessionId', (req, res) => {
  stopMonitoring(req.params.sessionId);
  res.json({ stopped: true });
});

export default router;
