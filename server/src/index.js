import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import generateRouter from './routes/generate.js';
import journeyRouter from './routes/journeys.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/generate', generateRouter);
app.use('/api/journeys', journeyRouter);

const PORT = process.env.PORT || 5050;
const MONGO_URI =
  process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ai_journey_builder';

// Start the API regardless of Mongo so prompt → generate → preview works even
// without a database. Saving/executing journeys needs Mongo; those routes
// surface a clear error if it is unavailable.
app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));

mongoose
  .connect(MONGO_URI, { serverSelectionTimeoutMS: 3000 })
  .then(() => console.log('Mongo connected'))
  .catch((err) =>
    console.warn(`Mongo not connected (save/execute disabled): ${err.message}`)
  );
