import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './lib/prisma';

const app = createApp();

const server = app.listen(env.port, () => {
  console.log(`[web-ulta-api] Server berjalan di http://localhost:${env.port}`);
});

async function shutdown(signal: string) {
  console.log(`[web-ulta-api] Menerima ${signal}, menutup server...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
