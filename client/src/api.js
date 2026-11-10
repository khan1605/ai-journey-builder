const JSON_HEADERS = { 'Content-Type': 'application/json' };

async function j(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  generate: (prompt) =>
    fetch('/api/generate', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ prompt })
    }).then(j),

  listJourneys: () => fetch('/api/journeys').then(j),

  saveJourney: (journey) =>
    fetch('/api/journeys', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(journey)
    }).then(j),

  execute: (journeyType, payload) =>
    fetch(`/api/journeys/${journeyType}/execute`, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ payload })
    }).then(j)
};
