// Repairs common malformed LLM output into a clean journey. Small models often
// (a) nest a step's fields inconsistently, (b) duplicate step vs field, and
// (c) drop the final Submit step. This layer makes the generator reliable.

// camelCase a label OR an already-camel/snake code into clean camelCase.
const toCamel = (s = '') => {
  const words = String(s)
    .trim()
    .replace(/([a-z])([A-Z])/g, '$1 $2') // split existing camelCase
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  return words
    .map((w, i) =>
      i === 0
        ? w.toLowerCase()
        : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    )
    .join('');
};

// Human-readable Title Case for labels.
const toTitle = (s = '') =>
  String(s)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

const asArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);

function normField(f) {
  if (!f) return null;
  const raw = f.label || f.name || f.code || '';
  const code = toCamel(f.code || f.name || raw);
  if (!code) return null;
  const allowed = ['text', 'number', 'email', 'select', 'date'];
  return {
    code,
    label: toTitle(f.label || raw || code),
    type: allowed.includes(f.type) ? f.type : 'text',
    required: Boolean(f.required)
  };
}

export function normalizeJourney(raw, promptTitle) {
  const steps = asArray(raw?.steps)
    .map((s) => {
      const raw = s.label || s.title || s.name || s.code || '';
      const code = toCamel(s.code || raw);
      if (!code) return null;
      const fields = asArray(s.fields).map(normField).filter(Boolean);
      return { code, label: toTitle(raw || code), fields };
    })
    .filter(Boolean);

  // Ensure a trailing Submit step (models often drop it).
  const hasSubmit = steps.some((s) => /submit|confirm|review/i.test(s.code));
  if (!hasSubmit) steps.push({ code: 'submit', label: 'Submit', fields: [] });

  const stepsKey =
    toCamel(raw?.stepsKey || promptTitle || 'newJourney') || 'newJourney';

  return { stepsKey, steps };
}
