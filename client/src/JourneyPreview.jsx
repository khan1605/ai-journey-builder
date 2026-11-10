import React, { useMemo, useState } from 'react';
import {
  Stepper,
  Step,
  StepButton,
  Box,
  Grid,
  TextField,
  MenuItem,
  Button,
  Typography,
  Paper
} from '@mui/material';

// Renders a journey as a live stepper + schema-driven form — exactly how the
// generated journey will look to an end user.
export default function JourneyPreview({ journey, onExecute }) {
  const steps = journey?.steps || [];
  const [active, setActive] = useState(0);
  const [values, setValues] = useState({});

  const current = steps[active] || {};
  const fields = current.fields || [];

  const setVal = (code, v) => setValues((p) => ({ ...p, [code]: v }));

  const isLast = active === steps.length - 1;

  const renderField = (f) => {
    if (f.type === 'select') {
      return (
        <TextField
          select
          fullWidth
          size="small"
          label={f.label + (f.required ? ' *' : '')}
          value={values[f.code] ?? ''}
          onChange={(e) => setVal(f.code, e.target.value)}
        >
          <MenuItem value="">— select —</MenuItem>
          <MenuItem value="option1">Option 1</MenuItem>
          <MenuItem value="option2">Option 2</MenuItem>
        </TextField>
      );
    }
    return (
      <TextField
        fullWidth
        size="small"
        type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
        InputLabelProps={f.type === 'date' ? { shrink: true } : undefined}
        label={f.label + (f.required ? ' *' : '')}
        value={values[f.code] ?? ''}
        onChange={(e) => setVal(f.code, e.target.value)}
      />
    );
  };

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Stepper nonLinear activeStep={active} sx={{ mb: 3 }}>
        {steps.map((s, i) => (
          <Step key={s.code} completed={false}>
            <StepButton onClick={() => setActive(i)}>{s.label}</StepButton>
          </Step>
        ))}
      </Stepper>

      {fields.length ? (
        <Grid container spacing={2}>
          {fields.map((f) => (
            <Grid item xs={12} sm={6} key={f.code}>
              {renderField(f)}
            </Grid>
          ))}
        </Grid>
      ) : (
        <Typography color="text.secondary" sx={{ py: 2 }}>
          No fields — info / submit step.
        </Typography>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button disabled={active === 0} onClick={() => setActive((a) => a - 1)}>
          Back
        </Button>
        {isLast ? (
          <Button variant="contained" onClick={() => onExecute?.(values)}>
            Submit journey
          </Button>
        ) : (
          <Button variant="contained" onClick={() => setActive((a) => a + 1)}>
            Next
          </Button>
        )}
      </Box>
    </Paper>
  );
}
