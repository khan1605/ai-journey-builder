import { Router } from 'express';
import { generateJourney } from '../llm/client.js';
import { normalizeJourney } from '../llm/normalize.js';

const router = Router();

// POST /api/generate  { prompt }  -> normalized journey (not yet saved)
router.post('/', async (req, res) => {
  const prompt = (req.body?.prompt || '').trim();
  if (!prompt) return res.status(400).json({ error: 'prompt is required' });
  try {
    const raw = await generateJourney(prompt);
    const journey = normalizeJourney(raw, prompt.slice(0, 40));
    res.json(journey);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

export default router;
