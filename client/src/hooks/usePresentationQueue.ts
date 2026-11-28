import { useCallback, useEffect, useRef, useState } from 'react';
import { audioManager } from '../services/audioManager';
import type {
  ActiveQuestionState,
  ActiveTurnState,
  QueuedPresentationEvent,
  ResolvedAnswerState,
} from '../store/gameStore';
import type {
  GameOverEvent,
  GamePhase,
  JumpEffect,
  MoveEvent,
  RoomPlayer,
} from '../types/protocol';

export type StageBanner =
  | {
      kind: 'TURN';
      playerId: string;
      playerName: string;
      isMe: boolean;
      colorIndex: number;
    }
  | {
      kind: 'EFFECT';
      effect: 'LADDER' | 'SNAKE';
      playerName: string;
      from: number;
      to: number;
    };

export interface PresentationTimings {
  turnBannerMs: number;
  diceSpinMs: number;
  diceRevealMs: number;
  stepMs: number;
  effectPopupMs: number;
  effectSlideMs: number;
  answerResultMs: number;
  answerStepMs: number;
  postAnswerPauseMs: number;
}

const DEFAULT_TIMINGS: PresentationTimings = {
  turnBannerMs: 1_300,
  diceSpinMs: 800,
  diceRevealMs: 260,
  stepMs: 280,
  effectPopupMs: 1_600,
  effectSlideMs: 420,
  answerResultMs: 2_500,
  answerStepMs: 240,
  postAnswerPauseMs: 1_000,
};

interface UsePresentationQueueParams {
  phase: GamePhase;
  presentationEvents: QueuedPresentationEvent[];
  players: RoomPlayer[];
  myPlayerId: string | null;
  authoritativePositions: Record<string, number>;
  timings?: Partial<PresentationTimings>;
}

export interface PresentationState {
  displayedPositions: Record<string, number>;
  displayedDice: number;
  isDiceRolling: boolean;
  hoppingPlayerId: string | null;
  highlightedPathKey: string | null;
  displayedTurn: ActiveTurnState | null;
  displayedMove: MoveEvent | null;
  displayedQuestion: ActiveQuestionState | null;
  displayedAnswerResult: ResolvedAnswerState | null;
  stageBanner: StageBanner | null;
  presentedGameOver: GameOverEvent | null;
  isAnimating: boolean;
  continueAnswerResult: () => void;
}

/**
 * Lapisan Presentation Queue (FIFO):
 * Memutar event server (TURN -> MOVE -> EFFECT -> QUESTION -> ANSWER_RESULT -> GAME_OVER)
 * secara berurutan dengan tempo santai, berlaku identik untuk Mock Mode dan Live WebSocket.
 */
export function usePresentationQueue({
  phase,
  presentationEvents,
  players,
  myPlayerId,
  authoritativePositions,
  timings,
}: UsePresentationQueueParams): PresentationState {
  const cfg: PresentationTimings = { ...DEFAULT_TIMINGS, ...timings };

  const [displayedPositions, setDisplayedPositions] = useState<
    Record<string, number>
  >(authoritativePositions);
  const [displayedDice, setDisplayedDice] = useState<number>(1);
  const [isDiceRolling, setIsDiceRolling] = useState<boolean>(false);
  const [hoppingPlayerId, setHoppingPlayerId] = useState<string | null>(null);
  const [highlightedPathKey, setHighlightedPathKey] = useState<string | null>(
    null,
  );
  const [displayedTurn, setDisplayedTurn] = useState<ActiveTurnState | null>(
    null,
  );
  const [displayedMove, setDisplayedMove] = useState<MoveEvent | null>(null);
  const [displayedQuestion, setDisplayedQuestion] =
    useState<ActiveQuestionState | null>(null);
  const [displayedAnswerResult, setDisplayedAnswerResult] =
    useState<ResolvedAnswerState | null>(null);
  const [stageBanner, setStageBanner] = useState<StageBanner | null>(null);
  const [presentedGameOver, setPresentedGameOver] =
    useState<GameOverEvent | null>(null);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);

  const playersRef = useRef<RoomPlayer[]>(players);
  playersRef.current = players;

  const myPlayerIdRef = useRef<string | null>(myPlayerId);
  myPlayerIdRef.current = myPlayerId;

  const displayedPositionsRef = useRef<Record<string, number>>(
    displayedPositions,
  );
  displayedPositionsRef.current = displayedPositions;

  const queueRef = useRef<QueuedPresentationEvent[]>([]);
  const lastEnqueuedIdRef = useRef<number>(0);
  const isRunningRef = useRef<boolean>(false);
  const sessionGenerationRef = useRef<number>(0);
  const skipAnswerResolverRef = useRef<(() => void) | null>(null);
  const activeTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  const clearAllWaitTimers = useCallback(() => {
    for (const timer of activeTimersRef.current) {
      clearTimeout(timer);
    }
    activeTimersRef.current.clear();
    if (skipAnswerResolverRef.current) {
      const resolve = skipAnswerResolverRef.current;
      skipAnswerResolverRef.current = null;
      resolve();
    }
  }, []);

  const waitMs = useCallback((ms: number, gen: number): Promise<boolean> => {
    return new Promise((resolve) => {
      if (sessionGenerationRef.current !== gen) {
        resolve(false);
        return;
      }
      const timer = setTimeout(() => {
        activeTimersRef.current.delete(timer);
        resolve(sessionGenerationRef.current === gen);
      }, ms);
      activeTimersRef.current.add(timer);
    });
  }, []);

  const waitSkippableAnswerResult = useCallback(
    (ms: number, gen: number): Promise<boolean> => {
      return new Promise((resolve) => {
        if (sessionGenerationRef.current !== gen) {
          resolve(false);
          return;
        }
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          activeTimersRef.current.delete(timer);
          if (skipAnswerResolverRef.current === finish) {
            skipAnswerResolverRef.current = null;
          }
          resolve(sessionGenerationRef.current === gen);
        };
        const timer = setTimeout(finish, ms);
        activeTimersRef.current.add(timer);
        skipAnswerResolverRef.current = finish;
      });
    },
    [],
  );

  const continueAnswerResult = useCallback(() => {
    if (skipAnswerResolverRef.current) {
      skipAnswerResolverRef.current();
    }
  }, []);

  const resetPresentation = useCallback(() => {
    sessionGenerationRef.current += 1;
    clearAllWaitTimers();
    queueRef.current = [];
    lastEnqueuedIdRef.current = 0;
    isRunningRef.current = false;

    setDisplayedPositions({});
    setDisplayedDice(1);
    setIsDiceRolling(false);
    setHoppingPlayerId(null);
    setHighlightedPathKey(null);
    setDisplayedTurn(null);
    setDisplayedMove(null);
    setDisplayedQuestion(null);
    setDisplayedAnswerResult(null);
    setStageBanner(null);
    setPresentedGameOver(null);
    setIsAnimating(false);
    audioManager.setDucked(false);
  }, [clearAllWaitTimers]);

  // Reset bersih saat kembali ke landing / lobby
  useEffect(() => {
    if (phase === 'landing' || phase === 'lobby') {
      resetPresentation();
    }
  }, [phase, resetPresentation]);

  useEffect(() => {
    return () => {
      sessionGenerationRef.current += 1;
      clearAllWaitTimers();
    };
  }, [clearAllWaitTimers]);

  const getPlayerInfo = useCallback((playerId: string) => {
    const found = playersRef.current.find((p) => p.playerId === playerId);
    return {
      name: found?.name ?? playerId,
      colorIndex: found?.colorIndex ?? 0,
    };
  }, []);

  const processNext = useCallback(async () => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;
    const gen = sessionGenerationRef.current;

    try {
      while (queueRef.current.length > 0 && sessionGenerationRef.current === gen) {
        const nextItem = queueRef.current.shift();
        if (!nextItem) break;
        const { event } = nextItem;

        if (event.type === 'GAME_START') {
          const initialPos: Record<string, number> = {};
          for (const id of event.turnOrder) {
            initialPos[id] = 1;
          }
          for (const p of event.players ?? playersRef.current) {
            initialPos[p.playerId] = p.position || 1;
          }
          setDisplayedPositions(initialPos);
          setDisplayedDice(1);
          setIsDiceRolling(false);
          setHoppingPlayerId(null);
          setHighlightedPathKey(null);
          setDisplayedTurn(null);
          setDisplayedMove(null);
          setDisplayedQuestion(null);
          setDisplayedAnswerResult(null);
          setStageBanner(null);
          setPresentedGameOver(null);
          setIsAnimating(false);
          continue;
        }

        if (event.type === 'TURN') {
          const info = getPlayerInfo(event.playerId);
          const isMe = event.playerId === myPlayerIdRef.current;

          setIsAnimating(true);
          setHighlightedPathKey(null);
          setDisplayedQuestion(null);
          setDisplayedAnswerResult(null);
          audioManager.setDucked(false);
          audioManager.playTurnStart(isMe);
          setStageBanner({
            kind: 'TURN',
            playerId: event.playerId,
            playerName: info.name,
            isMe,
            colorIndex: info.colorIndex,
          });

          const ok = await waitMs(cfg.turnBannerMs, gen);
          if (!ok) return;

          setStageBanner(null);
          setDisplayedTurn({
            playerId: event.playerId,
            ...(event.turnNo !== undefined ? { turnNo: event.turnNo } : {}),
            deadline: event.deadline,
            startedAt: Date.now(),
          });
          setIsAnimating(false);
          continue;
        }

        if (event.type === 'MOVE') {
          const info = getPlayerInfo(event.playerId);
          setIsAnimating(true);
          setStageBanner(null);
          setHighlightedPathKey(null);

          // 1. Putar animasi dadu ~0.8 detik + SFX kocokan dadu kayu
          setIsDiceRolling(true);
          audioManager.playDiceRoll(cfg.diceSpinMs);
          const spinOk = await waitMs(cfg.diceSpinMs, gen);
          if (!spinOk) return;

          setIsDiceRolling(false);
          setDisplayedDice(event.dice);
          setDisplayedMove(event);

          const revealOk = await waitMs(cfg.diceRevealMs, gen);
          if (!revealOk) return;

          // 2. Gerakkan pion satu petak per satu petak (~280ms per langkah) + bunyi tok bidak
          const steps = event.path.length > 0 ? event.path : [event.to];
          setDisplayedPositions((prev) => ({
            ...prev,
            [event.playerId]: event.from,
          }));

          for (let i = 0; i < steps.length; i += 1) {
            const stepTile = steps[i];
            setHoppingPlayerId(event.playerId);
            audioManager.playPawnStep(i);
            setDisplayedPositions((prev) => ({
              ...prev,
              [event.playerId]: stepTile,
            }));
            const stepOk = await waitMs(cfg.stepMs, gen);
            if (!stepOk) return;
          }
          setHoppingPlayerId(null);

          // 3. Jalankan seluruh rantai efek Ular/Tangga (mendukung beruntun dari server Python `effects`)
          const landingTile = steps[steps.length - 1] ?? event.from;
          const jumpList: JumpEffect[] =
            event.effects.length > 0
              ? event.effects
              : (event.effect === 'LADDER' || event.effect === 'SNAKE') &&
                  landingTile !== event.to
                ? [{ from: landingTile, kind: event.effect, to: event.to }]
                : [];

          if (jumpList.length > 0) {
            for (const jump of jumpList) {
              const pathKey = `${jump.kind}-${jump.from}-${jump.to}`;
              setHighlightedPathKey(pathKey);

              const prePauseOk = await waitMs(180, gen);
              if (!prePauseOk) return;

              if (jump.kind === 'LADDER') {
                audioManager.playLadderClimb();
              } else {
                audioManager.playSnakeSlide();
              }

              setStageBanner({
                kind: 'EFFECT',
                effect: jump.kind,
                playerName: info.name,
                from: jump.from,
                to: jump.to,
              });

              const popupOk = await waitMs(cfg.effectPopupMs, gen);
              if (!popupOk) return;

              setStageBanner(null);
              setDisplayedPositions((prev) => ({
                ...prev,
                [event.playerId]: jump.to,
              }));

              const slideOk = await waitMs(cfg.effectSlideMs, gen);
              if (!slideOk) return;

              setHighlightedPathKey(null);
            }
          } else {
            setDisplayedPositions((prev) => ({
              ...prev,
              [event.playerId]: event.to,
            }));
            const settleOk = await waitMs(220, gen);
            if (!settleOk) return;
          }

          // Pastikan posisi sinkron 100% dengan authoritative `event.to`
          setDisplayedPositions((prev) => ({
            ...prev,
            [event.playerId]: event.to,
          }));
          setIsAnimating(false);
          continue;
        }

        if (event.type === 'QUESTION') {
          setStageBanner(null);
          setDisplayedAnswerResult(null);
          audioManager.setDucked(true);
          audioManager.playQuizOpen();
          setDisplayedQuestion({
            ...event,
            startedAt: Date.now(),
          });
          setIsAnimating(false);
          continue;
        }

        if (event.type === 'ANSWER_RESULT') {
          setIsAnimating(true);
          const pid = event.playerId ?? myPlayerIdRef.current ?? 'unknown';
          const info = getPlayerInfo(pid);
          const fromPos = event.from ?? displayedPositionsRef.current[pid] ?? 1;
          const inferredCorrect =
            event.correct !== undefined
              ? event.correct
              : event.path && event.path.length > 0
                ? event.path[0] > fromPos ||
                  (event.path[0] < fromPos && fromPos === 100)
                : event.to > fromPos || (fromPos === 100 && event.to === 100);

          const resolved: ResolvedAnswerState = {
            ...event,
            playerId: pid,
            from: fromPos,
            inferredCorrect,
          };

          if (inferredCorrect) {
            audioManager.playQuizCorrect();
          } else {
            audioManager.playQuizWrong();
          }

          // Tampilkan hasil jawaban di modal selama ~2.5 detik (atau sampai tombol "Lanjut" ditekan)
          setDisplayedAnswerResult(resolved);
          const resultOk = await waitSkippableAnswerResult(
            cfg.answerResultMs,
            gen,
          );
          if (!resultOk) return;

          // Tutup modal kuis, kembalikan volume BGM, lalu jalankan langkah pion bonus/penalti
          setDisplayedQuestion(null);
          setDisplayedAnswerResult(null);
          audioManager.setDucked(false);

          // Gunakan `event.path` dari server Python bila tersedia (mendukung pantulan 100 & rantai efek)
          const walkSteps: number[] =
            event.path && event.path.length > 0
              ? event.path
              : (() => {
                  const arr: number[] = [];
                  if (event.to !== fromPos) {
                    const dir = event.to > fromPos ? 1 : -1;
                    let cur = fromPos;
                    while (cur !== event.to) {
                      cur += dir;
                      arr.push(cur);
                    }
                  }
                  return arr;
                })();

          if (walkSteps.length > 0) {
            for (let i = 0; i < walkSteps.length; i += 1) {
              setHoppingPlayerId(pid);
              audioManager.playPawnStep(i);
              setDisplayedPositions((prev) => ({
                ...prev,
                [pid]: walkSteps[i],
              }));
              const stepOk = await waitMs(cfg.answerStepMs, gen);
              if (!stepOk) return;
            }
            setHoppingPlayerId(null);
          }

          // Jika langkah bonus/penalti memicu Ular atau Tangga (sesuai game.py `_advance_locked`)
          if (event.effects.length > 0) {
            for (const jump of event.effects) {
              const pathKey = `${jump.kind}-${jump.from}-${jump.to}`;
              setHighlightedPathKey(pathKey);

              const prePauseOk = await waitMs(160, gen);
              if (!prePauseOk) return;

              if (jump.kind === 'LADDER') {
                audioManager.playLadderClimb();
              } else {
                audioManager.playSnakeSlide();
              }

              setStageBanner({
                kind: 'EFFECT',
                effect: jump.kind,
                playerName: info.name,
                from: jump.from,
                to: jump.to,
              });

              const popupOk = await waitMs(cfg.effectPopupMs, gen);
              if (!popupOk) return;

              setStageBanner(null);
              setDisplayedPositions((prev) => ({
                ...prev,
                [pid]: jump.to,
              }));

              const slideOk = await waitMs(cfg.effectSlideMs, gen);
              if (!slideOk) return;

              setHighlightedPathKey(null);
            }
          }

          setDisplayedPositions((prev) => ({
            ...prev,
            [pid]: event.to,
          }));

          // Jeda santai ~1 detik sebelum pop-up giliran pemain berikutnya
          const pauseOk = await waitMs(cfg.postAnswerPauseMs, gen);
          if (!pauseOk) return;

          setIsAnimating(false);
          continue;
        }

        if (event.type === 'GAME_OVER') {
          setIsAnimating(true);
          const beatOk = await waitMs(450, gen);
          if (!beatOk) return;
          setStageBanner(null);
          setDisplayedQuestion(null);
          setDisplayedAnswerResult(null);
          audioManager.setDucked(false);
          audioManager.playGameOver();
          setPresentedGameOver(event);
          setIsAnimating(false);
          continue;
        }
      }
    } finally {
      if (sessionGenerationRef.current === gen) {
        isRunningRef.current = false;
      }
    }
  }, [
    cfg.answerResultMs,
    cfg.answerStepMs,
    cfg.diceRevealMs,
    cfg.diceSpinMs,
    cfg.effectPopupMs,
    cfg.effectSlideMs,
    cfg.postAnswerPauseMs,
    cfg.stepMs,
    cfg.turnBannerMs,
    getPlayerInfo,
    waitMs,
    waitSkippableAnswerResult,
  ]);

  // Masukkan event baru dari store ke FIFO internal tanpa menimpa yang sedang diputar
  useEffect(() => {
    if (presentationEvents.length === 0) return;

    const fresh = presentationEvents.filter(
      (item) => item.id > lastEnqueuedIdRef.current,
    );
    if (fresh.length === 0) return;

    // Jika ada GAME_START baru, mulai antrean bersih dari GAME_START tersebut
    const lastGameStartIdx = fresh.reduce(
      (found, item, idx) => (item.event.type === 'GAME_START' ? idx : found),
      -1,
    );

    if (lastGameStartIdx >= 0) {
      sessionGenerationRef.current += 1;
      clearAllWaitTimers();
      isRunningRef.current = false;
      queueRef.current = fresh.slice(lastGameStartIdx);
    } else {
      queueRef.current.push(...fresh);
    }

    lastEnqueuedIdRef.current = fresh[fresh.length - 1].id;
    void processNext();
  }, [presentationEvents, clearAllWaitTimers, processNext]);

  return {
    displayedPositions,
    displayedDice,
    isDiceRolling,
    hoppingPlayerId,
    highlightedPathKey,
    displayedTurn,
    displayedMove,
    displayedQuestion,
    displayedAnswerResult,
    stageBanner,
    presentedGameOver,
    isAnimating,
    continueAnswerResult,
  };
}
