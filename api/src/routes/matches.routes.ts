import { Router } from 'express';
import { AppError } from '../middleware/errorHandler';
import {
  getMatchById,
  getMatchHistory,
  saveMatchResult,
} from '../services/gameStats.service';
import {
  matchesQuerySchema,
  saveMatchSchema,
} from '../validators/game.validator';

const router = Router();

router.get('/', async (req, res) => {
  const query = matchesQuerySchema.parse(req.query);
  const data = await getMatchHistory(query);

  res.json({
    ok: true,
    data,
  });
});

router.get('/:id', async (req, res) => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const matchId = Number(rawId);

  if (!Number.isInteger(matchId) || matchId <= 0) {
    throw new AppError(400, 'ID pertandingan harus berupa bilangan bulat positif.', 'INVALID_ID');
  }

  const data = await getMatchById(matchId);

  res.json({
    ok: true,
    data,
  });
});

router.post('/', async (req, res) => {
  const payload = saveMatchSchema.parse(req.body);
  const result = await saveMatchResult(payload);

  res.status(result.deduplicated ? 200 : 201).json({
    ok: true,
    data: result.match,
    meta: {
      deduplicated: result.deduplicated,
    },
  });
});

export default router;
