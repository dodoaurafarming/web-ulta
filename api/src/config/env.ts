import 'dotenv/config';

const rawCorsOrigin =
  process.env.CORS_ORIGIN ??
  'http://localhost:5173,http://127.0.0.1:5173,https://web-ulta.vercel.app';

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: process.env.DATABASE_URL ?? '',
  corsOrigins: rawCorsOrigin
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
};
