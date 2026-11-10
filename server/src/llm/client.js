// Provider-pluggable LLM client. Both providers are asked to return a journey
// via a single tool/function call so the output is structured, not prose.

const TOOL_NAME = 'build_journey';

const TOOL_SCHEMA = {
  name: TOOL_NAME,
  description:
    'Return the onboarding journey as ordered steps. A STEP is a page (a named ' +
    'section). The items belonging to a step are its FIELDS, not steps.',
  parameters: {
    type: 'object',
    properties: {
      stepsKey: {
        type: 'string',
        description: 'camelCase key, e.g. "supplierOnboarding"'
      },
      steps: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'camelCase step code' },
            label: { type: 'string' },
            fields: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  code: { type: 'string' },
                  label: { type: 'string' },
                  type: {
                    type: 'string',
                    enum: ['text', 'number', 'email', 'select', 'date']
                  },
                  required: { type: 'boolean' }
                },
                required: ['code', 'label']
              }
            }
          },
          required: ['code', 'label']
        }
      }
    },
    required: ['stepsKey', 'steps']
  }
};

const SYSTEM_PROMPT =
  'You design onboarding journeys. ALWAYS call build_journey. A STEP is a page ' +
  '(a named section like "Company Details" or "Submit"). The items listed for a ' +
  'step are that step\'s FIELDS, not steps. Make one step per named section — do ' +
  'NOT make a step per field. Keep a final "Submit" step with no fields.';

async function callOllama(prompt) {
  const url = process.env.OLLAMA_URL || 'http://localhost:11434';
  const model = process.env.OLLAMA_MODEL || 'qwen2.5:3b';
  const res = await fetch(`${url}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      tools: [{ type: 'function', function: TOOL_SCHEMA }]
    })
  });
  if (!res.ok) throw new Error(`Ollama error ${res.status}`);
  const data = await res.json();
  const call = data?.message?.tool_calls?.[0]?.function?.arguments;
  if (!call) throw new Error('Model did not return a journey.');
  return typeof call === 'string' ? JSON.parse(call) : call;
}

async function callOpenRouter(prompt) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OPENROUTER_API_KEY not set.');
  const model = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-8b-instruct:free';
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      tools: [{ type: 'function', function: TOOL_SCHEMA }],
      tool_choice: { type: 'function', function: { name: TOOL_NAME } }
    })
  });
  if (!res.ok) throw new Error(`OpenRouter error ${res.status}`);
  const data = await res.json();
  const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new Error('Model did not return a journey.');
  return typeof args === 'string' ? JSON.parse(args) : args;
}

async function callAnthropic(prompt) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY not set.');
  const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5';
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model,
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      tools: [
        {
          name: TOOL_SCHEMA.name,
          description: TOOL_SCHEMA.description,
          input_schema: TOOL_SCHEMA.parameters
        }
      ],
      tool_choice: { type: 'tool', name: TOOL_NAME },
      messages: [{ role: 'user', content: prompt }]
    })
  });
  if (!res.ok) throw new Error(`Anthropic error ${res.status}`);
  const data = await res.json();
  const block = (data?.content || []).find((b) => b.type === 'tool_use');
  if (!block) throw new Error('Model did not return a journey.');
  return block.input;
}

const PROVIDERS = {
  ollama: callOllama,
  openrouter: callOpenRouter,
  anthropic: callAnthropic
};

// Returns { journey, source }. Tries the configured LLM provider; on any
// failure (no key, rate limit, bad output) falls back to the rule-based parser
// so the endpoint never hard-fails for a visitor.
export async function generateJourney(prompt) {
  const provider = (process.env.LLM_PROVIDER || 'ollama').toLowerCase();
  const fn = PROVIDERS[provider] || callOllama;
  try {
    const raw = await fn(prompt);
    return { raw, source: provider };
  } catch (err) {
    return { raw: null, source: 'fallback', error: err.message };
  }
}
