import 'dotenv/config';
import { app } from './app';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] Smart Parking API running on http://0.0.0.0:${PORT} (accessible on LAN)`);
});
