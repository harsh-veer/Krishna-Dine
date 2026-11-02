'use strict';
const http = require('http');
const { env, assertEnv } = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');
const { createApp } = require('./app');
const { initSocket } = require('./sockets');

async function start() {
  assertEnv();
  await connectDB();
  require('./seed/hindi').backfillHindi().catch((e) => console.warn('Hindi name backfill skipped:', e.message));
  const app = createApp();
  const server = http.createServer(app);
  const io = initSocket(server);

  server.listen(env.port, () => {
    console.log(`Krishna Dine API listening on port ${env.port} (${env.nodeEnv})`);
    console.log(`Allowed client origins: ${env.corsOrigins.join(', ') || '(none)'}`);
    console.log(`QR codes point to: ${env.publicMenuUrl}/menu/<token>`);
  });

  const shutdown = async (signal) => {
    console.log(`${signal} received, shutting down`);
    io.close();
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((err) => {
  console.error(err.code === 'CONFIG' ? err.message : err);
  process.exit(1);
});
