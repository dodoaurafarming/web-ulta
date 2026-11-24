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

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigins.includes('*') ? true : env.corsOrigins,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '100kb' }));

  app.use('/api/health', healthRoutes);
  app.use('/api/leaderboard', leaderboardRoutes);
  app.use('/api/matches', matchesRoutes);
  app.use('/api/players', playersRoutes);
  app.use('/api/questions', questionsRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
