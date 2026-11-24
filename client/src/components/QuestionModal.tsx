import { useEffect, useState } from 'react';
import {
  Brain,
  CheckCircle2,
  Clock,
  Eye,
  Loader2,
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
  A: 'bg-[#2B6CB0] text-[#FFFDF8]',
  B: 'bg-[#2F7D57] text-[#FFFDF8]',
  C: 'bg-[#C4881A] text-[#FFFDF8]',
  D: 'bg-[#C8523B] text-[#FFFDF8]',
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F1B17]/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quiz-modal-title"
    >
      <div className="animate-toast-enter w-full max-w-xl overflow-hidden rounded-2xl border-2 border-[#352517] bg-[#FFFDF8] shadow-[0_8px_0_0_#352517]">
        {/* Header Kartu Kuis (Mustard Editorial Tabletop) */}
        <div className="border-b-2 border-[#D9B65E] bg-[#F8E7B4] p-4 sm:p-5 text-[#1F1B17]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#B7791F] bg-[#FFFDF8] text-[#B7791F]">
                <Brain className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#7D530B]">
                  {question.category ?? 'Kuis IT — Petak Soal'}
                </p>
                <h2
                  id="quiz-modal-title"
                  className="font-display text-lg font-extrabold leading-tight"
                >
                  {isAnswering
                    ? 'Giliran Anda Menjawab'
                    : `${targetName} sedang menjawab soal...`}
                </h2>
              </div>
            </div>

            <div
              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 font-code text-sm font-bold ${
                isUrgent
                  ? 'border-[#963826] bg-[#C8523B] text-[#FFFDF8]'
                  : 'border-[#B7791F]/40 bg-[#FFFDF8] text-[#1F1B17]'
              }`}
            >
              <Clock className="h-4 w-4" />
              <span>{Math.ceil(remainingSec)}d</span>
            </div>
          </div>

          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#E5CF90]">
            <div
              style={{ width: `${progressPct}%` }}
              className={`h-full rounded-full transition-all duration-100 ${
                isUrgent ? 'bg-[#C8523B]' : 'bg-[#2F7D57]'
              }`}
            />
          </div>
        </div>

        {/* Isi Soal */}
        <div className="p-5 sm:p-6 space-y-4">
          {!isAnswering && (
            <div className="flex items-center gap-2 rounded-xl border border-[#C5D8EC] bg-[#EAF2FB] px-3.5 py-2.5 text-xs font-semibold text-[#1E4B7A]">
              <Eye className="h-4 w-4 shrink-0" />
              <span>
                Mode Penonton: <strong>{targetName}</strong> sedang memilih
                jawaban. Hasil terlihat dari pergerakan pion.
              </span>
            </div>
          )}

          <p className="text-base font-bold text-[#1F1B17] leading-relaxed sm:text-lg">
            {question.prompt}
          </p>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {CHOICES.map((choice) => {
              const isPicked = selectedChoice === choice;
              return (
                <button
                  key={choice}
                  type="button"
                  disabled={!isAnswering || selectedChoice !== null}
                  onClick={() => handleSelect(choice)}
                  className={`btn-tactile flex items-center gap-3 rounded-xl border-[1.5px] p-3 text-left transition-colors ${
                    isPicked
                      ? 'border-[#1F1B17] bg-[#FDF3D7] shadow-[0_2px_0_0_#1F1B17]'
                      : isAnswering
                        ? 'border-[#DDD2C0] bg-[#FAF6EE] shadow-[0_2px_0_0_#E2D7C4] hover:border-[#1F1B17] hover:bg-[#FFFDF8] cursor-pointer'
                        : 'border-[#E6DDD0] bg-[#FAF6EE]/70 opacity-85 cursor-default'
                  }`}
                >
                  <span
                    className={`flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-lg font-display text-sm font-extrabold ${CHOICE_BADGE[choice]}`}
                  >
                    {choice}
                  </span>
                  <span className="text-sm font-semibold text-[#1F1B17] leading-snug">
                    {question.options[choice]}
                  </span>
                </button>
              );
            })}
          </div>

          {isAnswering && selectedChoice && (
            <p className="flex items-center justify-center gap-1.5 text-xs font-bold text-[#7D530B]">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>
                Pilihan {selectedChoice} terkirim — menunggu evaluasi server...
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
      className={`animate-toast-enter flex items-center gap-3 rounded-xl border-[1.5px] px-4 py-2.5 text-xs font-bold sm:text-sm ${
        isSuccess
          ? 'border-[#BBDAC8] bg-[#E6F2EB] text-[#1D5439]'
          : 'border-[#ECC1B7] bg-[#FCEBE7] text-[#8F2F1E]'
      }`}
    >
      {isSuccess ? (
        <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-[#2F7D57]" />
      ) : (
        <XCircle className="h-4.5 w-4.5 shrink-0 text-[#C8523B]" />
      )}
      <div className="flex-1">
        <p>
          {isSuccess
            ? `${playerName} maju +${result.bonusDice} petak (${result.from} → ${result.to}).`
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
