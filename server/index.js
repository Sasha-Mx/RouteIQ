import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import planRouter from './routes/plan.js';
import liveRouter from './routes/live.js';
import monitorRouter from './routes/monitor.js';
import placesRouter from './routes/places.js';

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '../.env') });

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: '*' }));
app.use(express.json());

app.use('/api/plan', planRouter);
app.use('/api/live', liveRouter);
app.use('/api/monitor', monitorRouter);
app.use('/api/places', placesRouter);

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.listen(PORT, () => console.log(`RouteIQ server running on port ${PORT}`));
