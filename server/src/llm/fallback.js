// Rule-based journey parser — no LLM. Handles the structured prompt form:
//   "... Section Name (field a, field b) -> Next Section (field c) -> Submit"
// Used as a zero-dependency fallback so the hosted demo always works, even
// with no API key or when the model is rate-limited.

const EMAIL_RE = /mail/i;
const NUMBER_RE = /number|amount|pincode|zip|count|qty|quantity|phone|mobile/i;
const DATE_RE = /date|dob|expiry|expiration/i;

function fieldType(label) {
  if (EMAIL_RE.test(label)) return 'email';
  if (DATE_RE.test(label)) return 'date';
  if (NUMBER_RE.test(label)) return 'number';
  return 'text';
}

const toCamel = (s = '') => {
  const w = s.replace(/[^a-zA-Z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
  return w
    .map((x, i) =>
      i === 0 ? x.toLowerCase() : x[0].toUpperCase() + x.slice(1).toLowerCase()
    )
    .join('');
};
const toTitle = (s = '') =>
  s.replace(/[_-]+/g, ' ').trim().replace(/\s+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export function parseJourney(prompt) {
  // Strip a leading intent clause like "Create a ... journey:" / "Save a journey:"
  let body = prompt.replace(/^.*?journey[:.]?/i, '').trim() || prompt;

  // Split on arrows or newlines into section chunks.
  const chunks = body
    .split(/->|→|\n/)
    .map((c) => c.trim())
    .filter(Boolean);

  const steps = [];
  for (const chunk of chunks) {
    const m = chunk.match(/^(.*?)\s*(?:\(([^)]*)\))?$/);
    if (!m) continue;
    const name = m[1].trim().replace(/[:.]$/, '');
    if (!name) continue;
    const fieldsRaw = (m[2] || '').trim();
    const fields = fieldsRaw
      ? fieldsRaw
          .split(',')
          .map((f) => f.trim())
          .filter(Boolean)
          .map((label) => ({
            code: toCamel(label),
            label: toTitle(label),
            type: fieldType(label),
            required: true
          }))
      : [];
    steps.push({ code: toCamel(name), label: toTitle(name), fields });
  }

  if (!steps.some((s) => /submit|confirm|review/i.test(s.code))) {
    steps.push({ code: 'submit', label: 'Submit', fields: [] });
  }

  // Derive a key from the first word(s) of the prompt.
  const keySrc = (prompt.match(/([A-Za-z]+)\s+onboarding/i)?.[1] || steps[0]?.label || 'new') + ' onboarding';
  return { stepsKey: toCamel(keySrc), steps };
}
