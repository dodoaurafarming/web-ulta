import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';

declare global {
  // eslint-disable-next-line no-var
  var __ultaPrisma__: PrismaClient | undefined;
}

export const prisma =
  globalThis.__ultaPrisma__ ??
  new PrismaClient({
    log: env.nodeEnv === 'development' ? ['warn', 'error'] : ['error'],
  });

if (env.nodeEnv !== 'production') {
  globalThis.__ultaPrisma__ = prisma;
}
