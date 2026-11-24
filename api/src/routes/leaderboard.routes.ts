import { Router } from 'express';
import { getLeaderboard } from '../services/gameStats.service';
import { leaderboardQuerySchema } from '../validators/game.validator';

const router = Router();

router.get('/', async (req, res) => {
  const query = leaderboardQuerySchema.parse(req.query);
  const data = await getLeaderboard(query);

  res.json({
    ok: true,
    data,
  });
});

export default router;
