import mongoose from 'mongoose';
import { connectDatabase } from './config/db.js';
import { createApp } from './app.js';
import { env } from './config/env.js';

// Server entry point
async function bootstrap() {
  await connectDatabase();

  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`[server] API running on http://localhost:${env.port} (${env.nodeEnv})`);
  });

  const shutdown = async (signal) => {
    console.log(`\n[server] ${signal} received — shutting down gracefully`);
    server.close(async () => {
      await mongoose.connection.close();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  console.error('[server] Failed to start:', err.message);
  process.exit(1);
});
