import { Router } from 'express';
import Journey from '../models/Journey.js';
import { runJourney, allowedCalls } from '../executor.js';

const router = Router();

// List all journeys
router.get('/', async (_req, res) => {
  const list = await Journey.find().sort({ updatedAt: -1 });
  res.json(list);
});

// The operations an action may reference (for the UI / docs)
router.get('/allowed-calls', (_req, res) => res.json(allowedCalls()));

// Get one by journeyType
router.get('/:journeyType', async (req, res) => {
  const doc = await Journey.findOne({ journeyType: req.params.journeyType });
  if (!doc) return res.status(404).json({ error: 'not found' });
  res.json(doc);
});

// Create or update (upsert by journeyType)
router.post('/', async (req, res) => {
  const { journeyType, label, stepsKey, steps, actions } = req.body || {};
  if (!journeyType) return res.status(400).json({ error: 'journeyType is required' });
  try {
    const doc = await Journey.findOneAndUpdate(
      { journeyType },
      { journeyType, label, stepsKey, steps, actions },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json(doc);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Run a saved journey's action sequence with a submitted payload
router.post('/:journeyType/execute', async (req, res) => {
  const doc = await Journey.findOne({ journeyType: req.params.journeyType });
  if (!doc) return res.status(404).json({ error: 'not found' });
  try {
    const result = await runJourney(doc, req.body?.payload || {});
    res.json({ journeyType: doc.journeyType, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
