#!/usr/bin/env node
// MCP server for AI Journey Builder.
//
// Exposes the journey engine as MCP tools so an AI assistant (Claude Desktop,
// Claude Code, etc.) can generate, persist, inspect and run onboarding
// journeys — the same backend the web app uses. Runs over stdio.
//
// Tools:
//   generate_journey  prompt            -> normalized journey schema (no save)
//   save_journey      journey           -> upsert into MongoDB
//   list_journeys                       -> all saved journeys
//   run_journey       journeyType, data -> execute the whitelisted actions
//
// Reuses the web server's LLM client, normalizer, model and executor so there
// is a single source of truth.

import 'dotenv/config';
import mongoose from 'mongoose';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

import { generateJourney } from '../../server/src/llm/client.js';
import { normalizeJourney } from '../../server/src/llm/normalize.js';
import { parseJourney } from '../../server/src/llm/fallback.js';
import { runJourney } from '../../server/src/executor.js';
import Journey from '../../server/src/models/Journey.js';

async function connectMongo() {
  if (mongoose.connection.readyState === 1) return;
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not set');
  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 8000
  });
}

const TOOLS = [
  {
    name: 'generate_journey',
    description:
      'Turn a plain-English prompt into a normalized multi-step journey ' +
      'schema (steps + fields). Does not save.',
    inputSchema: {
      type: 'object',
      properties: { prompt: { type: 'string' } },
      required: ['prompt']
    }
  },
  {
    name: 'save_journey',
    description:
      'Persist a journey to MongoDB (upsert by journeyType). Pass a journey ' +
      'object with journeyType, label, stepsKey, steps and optional actions.',
    inputSchema: {
      type: 'object',
      properties: {
        journeyType: { type: 'string' },
        label: { type: 'string' },
        stepsKey: { type: 'string' },
        steps: { type: 'array' },
        actions: { type: 'array' }
      },
      required: ['journeyType', 'steps']
    }
  },
  {
    name: 'list_journeys',
    description: 'List all saved journeys.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'run_journey',
    description:
      "Execute a saved journey's whitelisted action sequence with a submitted " +
      'payload. Returns captured ids and a step log.',
    inputSchema: {
      type: 'object',
      properties: {
        journeyType: { type: 'string' },
        payload: { type: 'object' }
      },
      required: ['journeyType']
    }
  }
];

const server = new Server(
  { name: 'ai-journey-builder', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

const text = (obj) => ({
  content: [{ type: 'text', text: JSON.stringify(obj, null, 2) }]
});

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args = {} } = req.params;
  try {
    if (name === 'generate_journey') {
      const { raw } = await generateJourney(args.prompt || '');
      const journey =
        raw != null
          ? normalizeJourney(raw, (args.prompt || '').slice(0, 40))
          : parseJourney(args.prompt || '');
      return text(journey);
    }

    if (name === 'save_journey') {
      await connectMongo();
      const doc = await Journey.findOneAndUpdate(
        { journeyType: args.journeyType },
        {
          journeyType: args.journeyType,
          label: args.label,
          stepsKey: args.stepsKey,
          steps: args.steps,
          actions: args.actions
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      return text({ saved: doc.journeyType, steps: doc.steps.length });
    }

    if (name === 'list_journeys') {
      await connectMongo();
      const list = await Journey.find().sort({ updatedAt: -1 });
      return text(
        list.map((j) => ({
          journeyType: j.journeyType,
          steps: j.steps.length,
          stepsKey: j.stepsKey
        }))
      );
    }

    if (name === 'run_journey') {
      await connectMongo();
      const doc = await Journey.findOne({ journeyType: args.journeyType });
      if (!doc) throw new Error(`No journey "${args.journeyType}"`);
      const result = await runJourney(doc, args.payload || {});
      return text(result);
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (err) {
    return {
      isError: true,
      content: [{ type: 'text', text: `Error: ${err.message}` }]
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('AI Journey Builder MCP server running on stdio');
