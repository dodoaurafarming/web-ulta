import { Router } from 'express';
import { AppError } from '../middleware/errorHandler';
import { getPlayerProfile } from '../services/gameStats.service';

const router = Router();

router.get('/:name', async (req, res) => {
  const rawName = Array.isArray(req.params.name)
    ? req.params.name[0]
    : req.params.name;
  const name = rawName?.trim();

  if (!name) {
    throw new AppError(400, 'Parameter nama pemain wajib diisi.', 'BAD_REQUEST');
  }

  const data = await getPlayerProfile(name);

  res.json({
    ok: true,
    data,
  });
});

export default router;
