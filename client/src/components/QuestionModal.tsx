import { useEffect, useState } from 'react';
import {
  Brain,
  CheckCircle2,
  Clock,
  Eye,
  Sparkles,
  XCircle,
} from 'lucide-react';
import type {
  ActiveQuestionState,
  ResolvedAnswerState,
} from '../store/gameStore';
import type { QuizChoice, RoomPlayer } from '../types/protocol';

interface QuestionModalProps {
  question: ActiveQuestionState | null;
  players: RoomPlayer[];
  isAnswering: boolean;
  onSubmitAnswer: (qId: string, choice: QuizChoice) => void;
}

const CHOICES: QuizChoice[] = ['A', 'B', 'C', 'D'];

const CHOICE_BADGE: Record<QuizChoice, string> = {
  A: 'bg-sky-500 text-white',
  B: 'bg-emerald-500 text-white',
  C: 'bg-amber-500 text-white',
  D: 'bg-rose-500 text-white',
};

export function QuestionModal({
  question,
  players,
  isAnswering,
  onSubmitAnswer,
}: QuestionModalProps) {
  const [remainingSec, setRemainingSec] = useState<number>(20);
  const [selectedChoice, setSelectedChoice] = useState<QuizChoice | null>(null);

  useEffect(() => {
    if (!question) {
      setSelectedChoice(null);
      return;
    }

    setSelectedChoice(null);
    const tick = () => {
      const elapsed = (Date.now() - question.startedAt) / 1000;
      setRemainingSec(Math.max(0, question.deadline - elapsed));
    };

    tick();
    const interval = setInterval(tick, 100);
    return () => clearInterval(interval);
  }, [question]);

  if (!question) return null;

  const targetPlayer = players.find((p) => p.playerId === question.playerId);
  const targetName = targetPlayer?.name ?? question.playerId;
  const progressPct =
    question.deadline > 0
      ? Math.max(0, Math.min(100, (remainingSec / question.deadline) * 100))
      : 0;
  const isUrgent = remainingSec <= 5;

  const handleSelect = (choice: QuizChoice) => {
    if (!isAnswering || selectedChoice !== null) return;
    setSelectedChoice(choice);
    onSubmitAnswer(question.qId, choice);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quiz-modal-title"
    >
      <div className="animate-toast-enter w-full max-w-xl overflow-hidden rounded-3xl border-4 border-violet-300 bg-white shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 via-indigo-600 to-sky-600 p-5 text-white">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
                <Brain className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-violet-100">
                  {question.category ?? 'Kuis IT — Petak Soal'}
                </p>
                <h2
                  id="quiz-modal-title"
                  className="font-display text-lg font-bold leading-tight"
                >
                  {isAnswering
                    ? 'Giliran Anda Menjawab!'
                    : `${targetName} sedang menjawab soal...`}
                </h2>
              </div>
            </div>

            <div
              className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 font-code text-sm font-bold ${
                isUrgent
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'bg-white/20 text-white'
              }`}
            >
              <Clock className="h-4 w-4" />
              <span>{Math.ceil(remainingSec)}d</span>
            </div>
          </div>

          {/* 20s Countdown Bar */}
          <div className="mt-3.5 h-2 w-full overflow-hidden rounded-full bg-white/25">
            <div
              style={{ width: `${progressPct}%` }}
              className={`h-full rounded-full transition-all duration-100 ${
                isUrgent ? 'bg-rose-300' : 'bg-amber-300'
              }`}
            />
          </div>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {!isAnswering && (
            <div className="flex items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-3.5 py-2.5 text-xs font-bold text-sky-900">
              <Eye className="h-4 w-4 shrink-0 text-sky-600" />
              <span>
                Mode Penonton: <strong>{targetName}</strong> sedang menjawab
                soal. Hasil akan terlihat dari perubahan posisi pion.
              </span>
            </div>
          )}

          <p className="text-base font-bold text-slate-900 leading-relaxed sm:text-lg">
            {question.prompt}
          </p>

          {/* Options A-D */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {CHOICES.map((choice) => {
              const isPicked = selectedChoice === choice;
              return (
                <button
                  key={choice}
                  type="button"
                  disabled={!isAnswering || selectedChoice !== null}
                  onClick={() => handleSelect(choice)}
                  className={`btn-tactile flex items-center gap-3 rounded-2xl border-2 p-3.5 text-left transition-all ${
                    isPicked
                      ? 'border-violet-600 bg-violet-50 ring-4 ring-violet-200'
                      : isAnswering
                        ? 'border-slate-200 bg-slate-50/70 hover:border-violet-400 hover:bg-violet-50/60 cursor-pointer'
                        : 'border-slate-200/70 bg-slate-50/60 opacity-85 cursor-default'
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-display text-sm font-bold shadow-sm ${CHOICE_BADGE[choice]}`}
                  >
                    {choice}
                  </span>
                  <span className="text-sm font-bold text-slate-800 leading-snug">
                    {question.options[choice]}
                  </span>
                </button>
              );
            })}
          </div>

          {isAnswering && selectedChoice && (
            <p className="flex items-center justify-center gap-1.5 text-xs font-bold text-violet-700">
              <Sparkles className="h-4 w-4 animate-spin" />
              <span>
                Pilihan {selectedChoice} terkirim! Menunggu evaluasi server...
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

interface AnswerResultBannerProps {
  result: ResolvedAnswerState | null;
  players: RoomPlayer[];
}

export function AnswerResultBanner({
  result,
  players,
}: AnswerResultBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!result) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 4_500);
    return () => clearTimeout(timer);
  }, [result]);

  if (!visible || !result) return null;

  const playerName =
    players.find((p) => p.playerId === result.playerId)?.name ??
    result.playerId;
  const isSpectatorInference = result.correct === undefined;
  const isSuccess = result.inferredCorrect;

  return (
    <div
      className={`animate-toast-enter flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-xs font-bold shadow-md sm:text-sm ${
        isSuccess
          ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
          : 'border-rose-300 bg-rose-50 text-rose-900'
      }`}
    >
      {isSuccess ? (
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
      ) : (
        <XCircle className="h-5 w-5 shrink-0 text-rose-600" />
      )}
      <div className="flex-1">
        <p>
          {isSuccess
            ? `${playerName} maju +${result.bonusDice} petak (${result.from} → ${result.to})!`
            : `${playerName} mundur -${result.bonusDice} petak (${result.from} → ${result.to}).`}
        </p>
        {isSpectatorInference && (
          <p className="text-[11px] font-medium opacity-80">
            Disimpulkan otomatis dari perubahan posisi (mode penonton).
          </p>
        )}
      </div>
    </div>
  );
}
