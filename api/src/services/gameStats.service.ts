import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import type {
  LeaderboardQuery,
  MatchesQuery,
  QuestionsQuery,
  SaveMatchInput,
  UpsertQuestionInput,
} from '../validators/game.validator';

const DUPLICATE_MATCH_WINDOW_MS = 2 * 60 * 1000;

function roundPercentage(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Number(((numerator / denominator) * 100).toFixed(1));
}

function roundDecimal(value: number | null | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Number(value.toFixed(1));
}

async function findExistingMatch(
  input: SaveMatchInput,
  finishedAt: Date,
  normalizedWinner: string,
) {
  if (input.matchKey) {
    const byKey = await prisma.matchHistory.findUnique({
      where: { matchKey: input.matchKey },
      include: {
        participants: {
          orderBy: { rank: 'asc' },
        },
      },
    });
    if (byKey) return byKey;
  }

  // Fallback anti-duplikasi berbasis window waktu (±2 menit) untuk room & pemenang yang sama
  const windowStart = new Date(finishedAt.getTime() - DUPLICATE_MATCH_WINDOW_MS);
  const windowEnd = new Date(finishedAt.getTime() + DUPLICATE_MATCH_WINDOW_MS);

  return prisma.matchHistory.findFirst({
    where: {
      roomCode: input.roomCode,
      winnerName: normalizedWinner,
      finishedAt: {
        gte: windowStart,
        lte: windowEnd,
      },
    },
    include: {
      participants: {
        orderBy: { rank: 'asc' },
      },
    },
    orderBy: { finishedAt: 'desc' },
  });
}

export async function saveMatchResult(input: SaveMatchInput) {
  const finishedAt = input.finishedAt ? new Date(input.finishedAt) : new Date();
  const startedAt = input.startedAt ? new Date(input.startedAt) : null;
  const normalizedWinner = input.winnerName.trim();

  const existing = await findExistingMatch(input, finishedAt, normalizedWinner);
  if (existing) {
    return {
      deduplicated: true,
      match: existing,
    };
  }

  try {
    const match = await prisma.$transaction(async (tx) => {
      const participantRows: Array<{
        playerStatId: number;
        playerId: string | null;
        playerName: string;
        rank: number;
        finalPosition: number;
        isWinner: boolean;
        questionsAnswered: number;
        questionsCorrect: number;
      }> = [];

      for (const participant of input.participants) {
        const playerName = participant.playerName.trim();
        const isWinner =
          participant.isWinner ??
          (participant.rank === 1 ||
            playerName.toLowerCase() === normalizedWinner.toLowerCase());

        const stat = await tx.playerStat.upsert({
          where: { playerName },
          create: {
            playerName,
            gamesPlayed: 1,
            gamesWon: isWinner ? 1 : 0,
            questionsAnswered: participant.questionsAnswered,
            questionsCorrect: participant.questionsCorrect,
            lastPlayedAt: finishedAt,
          },
          update: {
            gamesPlayed: { increment: 1 },
            gamesWon: { increment: isWinner ? 1 : 0 },
            questionsAnswered: { increment: participant.questionsAnswered },
            questionsCorrect: { increment: participant.questionsCorrect },
            lastPlayedAt: finishedAt,
          },
        });

        participantRows.push({
          playerStatId: stat.id,
          playerId: participant.playerId ?? null,
          playerName,
          rank: participant.rank,
          finalPosition: participant.finalPosition,
          isWinner,
          questionsAnswered: participant.questionsAnswered,
          questionsCorrect: participant.questionsCorrect,
        });
      }

      return tx.matchHistory.create({
        data: {
          matchKey: input.matchKey ?? null,
          roomCode: input.roomCode,
          winnerName: normalizedWinner,
          totalPlayers: participantRows.length,
          startedAt,
          finishedAt,
          participants: {
            create: participantRows,
          },
        },
        include: {
          participants: {
            orderBy: { rank: 'asc' },
          },
        },
      });
    });

    return {
      deduplicated: false,
      match,
    };
  } catch (err) {
    // Jika 2 client mengirim matchKey yang sama persis secara bersamaan (race condition P2002),
    // kembalikan record yang sudah tersimpan tanpa error agar idempoten.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      const concurrentExisting = await findExistingMatch(
        input,
        finishedAt,
        normalizedWinner,
      );
      if (concurrentExisting) {
        return {
          deduplicated: true,
          match: concurrentExisting,
        };
      }
    }
    throw err;
  }
}

export async function getLeaderboard(query: LeaderboardQuery) {
  const where = query.search
    ? {
        playerName: {
          contains: query.search,
        },
      }
    : undefined;

  const [total, players] = await Promise.all([
    prisma.playerStat.count({ where }),
    prisma.playerStat.findMany({
      where,
      orderBy: [
        { gamesWon: 'desc' },
        { gamesPlayed: 'desc' },
        { questionsCorrect: 'desc' },
        { updatedAt: 'desc' },
      ],
      take: query.limit,
      skip: query.offset,
    }),
  ]);

  const playerIds = players.map((p) => p.id);
  const avgPositionsByPlayerId = new Map<number, number>();

  if (playerIds.length > 0) {
    const grouped = await prisma.matchParticipant.groupBy({
      by: ['playerStatId'],
      where: {
        playerStatId: {
          in: playerIds,
        },
      },
      _avg: {
        finalPosition: true,
      },
    });

    for (const row of grouped) {
      if (row.playerStatId !== null) {
        avgPositionsByPlayerId.set(
          row.playerStatId,
          roundDecimal(row._avg.finalPosition),
        );
      }
    }
  }

  const items = players.map((player, index) => ({
    rank: query.offset + index + 1,
    id: player.id,
    playerName: player.playerName,
    gamesPlayed: player.gamesPlayed,
    gamesWon: player.gamesWon,
    winRate: roundPercentage(player.gamesWon, player.gamesPlayed),
    questionsAnswered: player.questionsAnswered,
    questionsCorrect: player.questionsCorrect,
    quizAccuracy: roundPercentage(
      player.questionsCorrect,
      player.questionsAnswered,
    ),
    averagePosition: avgPositionsByPlayerId.get(player.id) ?? 0,
    lastPlayedAt: player.lastPlayedAt,
  }));

  return {
    items,
    pagination: {
      total,
      limit: query.limit,
      offset: query.offset,
    },
  };
}

export async function getPlayerProfile(playerName: string) {
  const player = await prisma.playerStat.findUnique({
    where: { playerName: playerName.trim() },
    include: {
      participations: {
        take: 10,
        orderBy: {
          match: {
            finishedAt: 'desc',
          },
        },
        include: {
          match: true,
        },
      },
    },
  });

  if (!player) {
    throw new AppError(
      404,
      `Pemain "${playerName}" belum memiliki catatan statistik.`,
      'PLAYER_NOT_FOUND',
    );
  }

  return {
    id: player.id,
    playerName: player.playerName,
    gamesPlayed: player.gamesPlayed,
    gamesWon: player.gamesWon,
    winRate: roundPercentage(player.gamesWon, player.gamesPlayed),
    questionsAnswered: player.questionsAnswered,
    questionsCorrect: player.questionsCorrect,
    quizAccuracy: roundPercentage(
      player.questionsCorrect,
      player.questionsAnswered,
    ),
    lastPlayedAt: player.lastPlayedAt,
    recentMatches: player.participations.map((entry) => ({
      matchId: entry.matchId,
      roomCode: entry.match.roomCode,
      winnerName: entry.match.winnerName,
      totalPlayers: entry.match.totalPlayers,
      finishedAt: entry.match.finishedAt,
      rank: entry.rank,
      finalPosition: entry.finalPosition,
      isWinner: entry.isWinner,
      questionsAnswered: entry.questionsAnswered,
      questionsCorrect: entry.questionsCorrect,
    })),
  };
}

export async function getMatchHistory(query: MatchesQuery) {
  const where = query.roomCode
    ? {
        roomCode: query.roomCode,
      }
    : undefined;

  const [total, matches] = await Promise.all([
    prisma.matchHistory.count({ where }),
    prisma.matchHistory.findMany({
      where,
      orderBy: { finishedAt: 'desc' },
      take: query.limit,
      skip: query.offset,
      include: {
        participants: {
          orderBy: { rank: 'asc' },
        },
      },
    }),
  ]);

  return {
    items: matches,
    pagination: {
      total,
      limit: query.limit,
      offset: query.offset,
    },
  };
}

export async function getMatchById(id: number) {
  const match = await prisma.matchHistory.findUnique({
    where: { id },
    include: {
      participants: {
        orderBy: { rank: 'asc' },
      },
    },
  });

  if (!match) {
    throw new AppError(
      404,
      `Riwayat pertandingan #${id} tidak ditemukan.`,
      'MATCH_NOT_FOUND',
    );
  }

  return match;
}

export async function listQuestionReferences(query: QuestionsQuery) {
  const where = {
    ...(query.category ? { category: query.category } : {}),
    ...(query.activeOnly ? { isActive: true } : {}),
  };

  const [total, items] = await Promise.all([
    prisma.questionBank.count({ where }),
    prisma.questionBank.findMany({
      where,
      orderBy: { code: 'asc' },
      take: query.limit,
      skip: query.offset,
      select: {
        id: true,
        code: true,
        category: true,
        difficulty: true,
        prompt: true,
        optionA: true,
        optionB: true,
        optionC: true,
        optionD: true,
        isActive: true,
        updatedAt: true,
      },
    }),
  ]);

  return {
    items,
    pagination: {
      total,
      limit: query.limit,
      offset: query.offset,
    },
  };
}

export async function upsertQuestionReference(input: UpsertQuestionInput) {
  return prisma.questionBank.upsert({
    where: { code: input.code },
    create: {
      code: input.code,
      category: input.category,
      difficulty: input.difficulty,
      prompt: input.prompt,
      optionA: input.optionA,
      optionB: input.optionB,
      optionC: input.optionC,
      optionD: input.optionD,
      answerKey: input.answerKey ?? null,
      isActive: input.isActive,
    },
    update: {
      category: input.category,
      difficulty: input.difficulty,
      prompt: input.prompt,
      optionA: input.optionA,
      optionB: input.optionB,
      optionC: input.optionC,
      optionD: input.optionD,
      answerKey: input.answerKey ?? null,
      isActive: input.isActive,
    },
    select: {
      id: true,
      code: true,
      category: true,
      difficulty: true,
      prompt: true,
      optionA: true,
      optionB: true,
      optionC: true,
      optionD: true,
      isActive: true,
      updatedAt: true,
    },
  });
}
