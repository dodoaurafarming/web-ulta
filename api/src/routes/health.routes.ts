import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/', async (req, res) => {
  const checkDb = req.query.db === 'true';

  if (!checkDb) {
    res.json({
      ok: true,
      service: 'web-ulta-api',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      ok: true,
      service: 'web-ulta-api',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch {
    res.status(503).json({
      ok: false,
      service: 'web-ulta-api',
      database: 'disconnected',
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
