import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  TextField,
  Button,
  Box,
  Stack,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  Paper
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { api } from './api.js';
import JourneyPreview from './JourneyPreview.jsx';

const SAMPLE =
  'Create a Supplier onboarding journey. Company Information (company name, ' +
  'registration number, supplier type, GST number) -> Contact Details (contact ' +
  'name, designation, email, phone) -> Warehouse Address (address line, city, ' +
  'state, pincode) -> Compliance Documents (document type, document number) -> Submit';

export default function App() {
  const [prompt, setPrompt] = useState(SAMPLE);
  const [busy, setBusy] = useState(false);
  const [journey, setJourney] = useState(null);
  const [source, setSource] = useState(null);
  const [saved, setSaved] = useState([]);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  const loadSaved = () => api.listJourneys().then(setSaved).catch(() => {});
  useEffect(() => { loadSaved(); }, []);

  const generate = async () => {
    setBusy(true); setErr(null); setMsg(null); setJourney(null);
    try {
      const { journey, source } = await api.generate(prompt);
      setJourney(journey);
      setSource(source);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!journey) return;
    setErr(null); setMsg(null);
    try {
      const doc = await api.saveJourney({
        journeyType: journey.stepsKey,
        label: journey.steps[0]?.label || journey.stepsKey,
        stepsKey: journey.stepsKey,
        steps: journey.steps,
        // A default demo action sequence so execute does something.
        actions: [
          { call: 'startWorkflow', capture: 'requestId' },
          { call: 'createParty', capture: 'partyId' },
          { call: 'createUser', needs: ['partyId'], capture: 'userId' },
          { call: 'submitWorkflow', needs: ['requestId', 'partyId', 'userId'] }
        ]
      });
      setMsg(`Saved "${doc.journeyType}" with ${doc.steps.length} steps.`);
      loadSaved();
    } catch (e) {
      setErr(e.message);
    }
  };

  const execute = async (values) => {
    setErr(null); setMsg(null);
    try {
      const res = await api.execute(journey.stepsKey, values);
      setMsg(`Executed. Captured: ${JSON.stringify(res.captured)} | ${res.log.join(' → ')}`);
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 5 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        AI Journey Builder
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Describe an onboarding flow in plain English. An LLM turns it into a
        multi-step, schema-driven form — preview it, save it, and run its action
        sequence through a safe whitelisted executor.
      </Typography>

      <TextField
        fullWidth multiline minRows={3} value={prompt}
        onChange={(e) => setPrompt(e.target.value)} sx={{ mb: 2 }}
      />
      <Button
        variant="contained" startIcon={busy ? <CircularProgress size={18} color="inherit" /> : <AutoAwesomeIcon />}
        disabled={busy || !prompt.trim()} onClick={generate}
      >
        {busy ? 'Generating…' : 'Generate journey'}
      </Button>

      {err && <Alert severity="error" sx={{ mt: 2 }}>{err}</Alert>}
      {msg && <Alert severity="success" sx={{ mt: 2 }}>{msg}</Alert>}

      {journey && (
        <Box sx={{ mt: 4 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="h6">Preview</Typography>
            <Chip size="small" label={journey.stepsKey} />
            {source && (
              <Chip
                size="small"
                variant="outlined"
                color={source === 'fallback' ? 'default' : 'success'}
                label={source === 'fallback' ? 'rule-based' : `LLM: ${source}`}
              />
            )}
            <Box flex={1} />
            <Button variant="outlined" onClick={save}>Save journey</Button>
          </Stack>
          <JourneyPreview journey={journey} onExecute={execute} />
        </Box>
      )}

      <Divider sx={{ my: 4 }} />
      <Typography variant="h6" gutterBottom>Saved journeys</Typography>
      {saved.length === 0 ? (
        <Typography color="text.secondary">None yet.</Typography>
      ) : (
        <Stack spacing={1}>
          {saved.map((s) => (
            <Paper key={s._id} variant="outlined" sx={{ p: 1.5 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip size="small" color="primary" label={s.journeyType} />
                <Typography>{s.steps?.length || 0} steps</Typography>
                <Box flex={1} />
                <Button size="small" onClick={() => setJourney(s)}>Open</Button>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </Container>
  );
}
