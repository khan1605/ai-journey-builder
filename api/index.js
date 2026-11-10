// Vercel serverless entry: hands all /api/* requests to the Express app.
import app from '../server/src/app.js';

export default function handler(req, res) {
  return app(req, res);
}
