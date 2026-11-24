import { Router } from 'express';
import {
  listQuestionReferences,
  upsertQuestionReference,
} from '../services/gameStats.service';
import {
  questionsQuerySchema,
  upsertQuestionSchema,
} from '../validators/game.validator';

const router = Router();

router.get('/', async (req, res) => {
  const query = questionsQuerySchema.parse(req.query);
  const data = await listQuestionReferences(query);

  res.json({
    ok: true,
    data,
  });
});

router.post('/', async (req, res) => {
  const payload = upsertQuestionSchema.parse(req.body);
  const data = await upsertQuestionReference(payload);

  res.status(201).json({
    ok: true,
    data,
  });
});

export default router;
