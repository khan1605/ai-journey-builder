import { Router } from 'express';
import { generateJourney } from '../llm/client.js';
import { normalizeJourney } from '../llm/normalize.js';
import { parseJourney } from '../llm/fallback.js';

const router = Router();

// POST /api/generate  { prompt }  -> { journey, source }
// source = the LLM provider used, or "fallback" (rule-based parser).
router.post('/', async (req, res) => {
  const prompt = (req.body?.prompt || '').trim();
  if (!prompt) return res.status(400).json({ error: 'prompt is required' });

  const { raw, source } = await generateJourney(prompt);
  const journey =
    raw != null
      ? normalizeJourney(raw, prompt.slice(0, 40))
      : parseJourney(prompt);
  res.json({ journey, source });
});

export default router;
