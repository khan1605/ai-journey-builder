import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import generateRouter from './routes/generate.js';
import journeyRouter from './routes/journeys.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Connect to Mongo once; safe to call repeatedly (works for serverless too).
let connecting = null;
export function ensureMongo() {
  if (mongoose.connection.readyState === 1) return Promise.resolve();
  if (!process.env.MONGO_URI) return Promise.resolve();
  if (!connecting) {
    connecting = mongoose
      .connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 })
      .then(() => console.log('Mongo connected'))
      .catch((e) => {
        connecting = null;
        console.warn(`Mongo not connected: ${e.message}`);
      });
  }
  return connecting;
}

// Lazily ensure a DB connection before handling each request (no-op once up).
app.use((_req, _res, next) => {
  ensureMongo().finally(next);
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/generate', generateRouter);
app.use('/api/journeys', journeyRouter);

export default app;
