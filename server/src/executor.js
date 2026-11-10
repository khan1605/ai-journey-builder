// Whitelisted action executor. A journey's `actions` can only name operations
// that exist in CALLS — the model/config selects WHICH runs and in what order,
// but never supplies a URL or arbitrary code. Unknown action => hard error.
//
// The demo operations are simulated (they return fake ids) so the project runs
// with no external systems. In a real deployment each entry would call a real
// backend; the safety model is identical.

const CALLS = {
  startWorkflow: async ({ ctx }) => {
    ctx._log.push('startWorkflow -> requestId');
    return `REQ-${Date.now()}`;
  },
  createParty: async ({ ctx }) => {
    ctx._log.push('createParty -> partyId (payload keys: ' +
      Object.keys(ctx.payload || {}).join(', ') + ')');
    return `PARTY-${Math.floor(Math.random() * 100000)}`;
  },
  createUser: async ({ ctx }) => {
    ctx._log.push(`createUser (uses partyId=${ctx.partyId}) -> userId`);
    return `USER-${Math.floor(Math.random() * 100000)}`;
  },
  submitWorkflow: async ({ ctx }) => {
    ctx._log.push(
      `submitWorkflow (requestId=${ctx.requestId}, partyId=${ctx.partyId}, userId=${ctx.userId})`
    );
    return 'SUBMITTED';
  }
};

export function allowedCalls() {
  return Object.keys(CALLS);
}

export async function runJourney(journey, payload) {
  const ctx = { payload, _log: [] };
  const actions = Array.isArray(journey?.actions) ? journey.actions : [];
  for (const action of actions) {
    const fn = CALLS[action.call];
    if (!fn) throw new Error(`Unknown action: ${action.call}`);
    for (const need of action.needs || []) {
      if (ctx[need] === undefined || ctx[need] === null) {
        throw new Error(`"${action.call}" needs "${need}" which is missing.`);
      }
    }
    const result = await fn({ action, ctx });
    if (action.capture) ctx[action.capture] = result;
  }
  const { _log, payload: _p, ...captured } = ctx;
  return { captured, log: _log };
}
