import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import generateRouter from './routes/generate.js';
import journeyRouter from './routes/journeys.js';

// Fail fast instead of queuing queries for 10s when there is no connection.
mongoose.set('bufferCommands', false);

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Connect once and cache the promise so warm serverless invocations reuse it.
let connectPromise = null;
export function ensureMongo() {
  if (!process.env.MONGO_URI) {
    return Promise.reject(new Error('MONGO_URI is not set'));
  }
  if (mongoose.connection.readyState === 1) return Promise.resolve();
  if (!connectPromise) {
    connectPromise = mongoose
      .connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 })
      .then((m) => {
        console.log('Mongo connected');
        return m;
      })
      .catch((e) => {
        connectPromise = null; // allow retry on next request
        throw e;
      });
  }
  return connectPromise;
}

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Generation needs no DB — mount it before the DB gate.
app.use('/api/generate', generateRouter);

// Journey routes need Mongo: await the connection, fail clearly if it's down.
app.use('/api/journeys', async (_req, res, next) => {
  try {
    await ensureMongo();
    next();
  } catch (e) {
    res.status(503).json({ error: `Database unavailable: ${e.message}` });
  }
});
app.use('/api/journeys', journeyRouter);

export default app;
