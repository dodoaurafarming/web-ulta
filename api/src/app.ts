import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import healthRoutes from './routes/health.routes';
import leaderboardRoutes from './routes/leaderboard.routes';
import matchesRoutes from './routes/matches.routes';
import playersRoutes from './routes/players.routes';
import questionsRoutes from './routes/questions.routes';

function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true;
  if (env.corsOrigins.includes('*')) return true;

  return env.corsOrigins.some((pattern) => {
    if (pattern === origin) return true;
    if (pattern.includes('*')) {
      const escaped = pattern
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\\\*/g, '.*');
      return new RegExp(`^${escaped}$`, 'i').test(origin);
    }
    return false;
  });
}

export function createApp() {
  const app = express();

  app.use(
    helmet({
      crossOriginResourcePolicy: false,
    }),
  );
  app.use(
    cors({
      origin(origin, callback) {
        if (isOriginAllowed(origin)) {
          callback(null, true);
          return;
        }
        callback(null, false);
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '100kb' }));

  app.get('/', (_req, res) => {
    res.json({
      ok: true,
      service: 'web-ulta-api',
      endpoints: ['/api/health', '/api/leaderboard', '/api/matches', '/api/players', '/api/questions'],
    });
  });

  app.use('/api/health', healthRoutes);
  app.use('/api/leaderboard', leaderboardRoutes);
  app.use('/api/matches', matchesRoutes);
  app.use('/api/players', playersRoutes);
  app.use('/api/questions', questionsRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
