import { z } from 'zod';

const participantInputSchema = z
  .object({
    playerId: z.string().trim().min(1).max(64).optional(),
    playerName: z.string().trim().min(1, 'Nama pemain wajib diisi').max(64),
    rank: z.coerce.number().int().min(1).max(10),
    finalPosition: z.coerce.number().int().min(1).max(100).default(1),
    isWinner: z.boolean().optional(),
    questionsAnswered: z.coerce.number().int().min(0).default(0),
    questionsCorrect: z.coerce.number().int().min(0).default(0),
  })
  .refine((p) => p.questionsCorrect <= p.questionsAnswered, {
    message: 'questionsCorrect tidak boleh melebihi questionsAnswered',
    path: ['questionsCorrect'],
  });

export const saveMatchSchema = z.object({
  matchKey: z.string().trim().min(1).max(120).optional(),
  roomCode: z
    .string()
    .trim()
    .min(4, 'Kode room minimal 4 karakter')
    .max(12, 'Kode room maksimal 12 karakter')
    .transform((value) => value.toUpperCase()),
  winnerName: z.string().trim().min(1, 'Nama pemenang wajib diisi').max(64),
  startedAt: z.string().datetime().optional(),
  finishedAt: z.string().datetime().optional(),
  participants: z
    .array(participantInputSchema)
    .min(2, 'Minimal 2 peserta dalam satu pertandingan')
    .max(5, 'Maksimal 5 peserta sesuai aturan ULTA/1.0'),
});

export const leaderboardQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  search: z.string().trim().max(64).optional(),
});

export const matchesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  roomCode: z
    .string()
    .trim()
    .max(12)
    .transform((value) => value.toUpperCase())
    .optional(),
});

export const questionsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
  category: z.string().trim().max(64).optional(),
  activeOnly: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value !== 'false'),
});

export const upsertQuestionSchema = z.object({
  code: z.string().trim().min(2).max(32),
  category: z.string().trim().min(2).max(64).default('Jaringan & IT'),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).default('MEDIUM'),
  prompt: z.string().trim().min(5).max(2000),
  optionA: z.string().trim().min(1).max(255),
  optionB: z.string().trim().min(1).max(255),
  optionC: z.string().trim().min(1).max(255),
  optionD: z.string().trim().min(1).max(255),
  answerKey: z.enum(['A', 'B', 'C', 'D']).optional(),
  isActive: z.boolean().default(true),
});

export type SaveMatchInput = z.infer<typeof saveMatchSchema>;
export type LeaderboardQuery = z.infer<typeof leaderboardQuerySchema>;
export type MatchesQuery = z.infer<typeof matchesQuerySchema>;
export type QuestionsQuery = z.infer<typeof questionsQuerySchema>;
export type UpsertQuestionInput = z.infer<typeof upsertQuestionSchema>;
