import 'dotenv/config';

const rawCorsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:5173';

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: process.env.DATABASE_URL ?? '',
  corsOrigins: rawCorsOrigin
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
};
