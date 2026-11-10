import 'dotenv/config';
import app, { ensureMongo } from './app.js';

const PORT = process.env.PORT || 5050;
ensureMongo().catch((e) => console.warn(e.message));
app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));
