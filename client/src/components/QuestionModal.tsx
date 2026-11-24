import { useEffect, useState } from 'react';
import {
  ArrowRight,
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
  answerResult: ResolvedAnswerState | null;
  players: RoomPlayer[];
  myPlayerId: string | null;
  onSubmitAnswer: (qId: string, choice: QuizChoice) => void;
  onContinueResult: () => void;
}

const CHOICES: QuizChoice[] = ['A', 'B', 'C', 'D'];

const CHOICE_BADGE: Record<QuizChoice, string> = {
  A: 'bg-[#2B6CB0] text-[#FFFDF8]',
  B: 'bg-[#266D4B] text-[#FFFDF8]',
  C: 'bg-[#B7791F] text-[#FFFDF8]',
  D: 'bg-[#C44B34] text-[#FFFDF8]',
};

/**
 * Modal Kuis IT + Pop-up Hasil Jawaban terintegrasi dengan Presentation Queue:
 * - Saat soal aktif: tampilkan soal & timer 20 detik (interaktif bagi penjawab, mode penonton bagi lainnya).
 * - Saat ANSWER_RESULT tiba: JANGAN langsung menutup modal — tampilkan layar hasil BENAR/SALAH
 *   (atau inferensi penonton), dadu bonus, dan perubahan petak selama ~2.5 detik dengan tombol "Lanjut".
 */
export function QuestionModal({
  question,
  answerResult,
  players,
  myPlayerId,
  onSubmitAnswer,
  onContinueResult,
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

  // Tampilkan modal jika ada soal aktif ATAU hasil jawaban yang sedang dipresentasikan
  if (!question && !answerResult) return null;

  // ============================================================================
  // FASE 2: Pop-up Hasil Jawaban Kuis (~2.5 detik, bisa dipercepat via "Lanjut")
  // ============================================================================
  if (answerResult) {
    const targetName =
      players.find((p) => p.playerId === answerResult.playerId)?.name ??
      answerResult.playerId;
    const isSpectatorInference = answerResult.correct === undefined;
    const isCorrect = answerResult.inferredCorrect;
    const isMe = Boolean(myPlayerId && answerResult.playerId === myPlayerId);

    const headline = isCorrect
      ? isSpectatorInference
        ? `${targetName} Berhasil Maju!`
        : isMe
          ? 'JAWABAN BENAR!'
          : `${targetName} Menjawab Benar!`
      : isSpectatorInference
        ? `${targetName} Terkena Penalti`
        : isMe
          ? 'JAWABAN SALAH'
          : `${targetName} Gagal Menjawab`;

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F1A15]/60 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quiz-result-title"
        data-quiz-result-popup
      >
        <div
          className={`animate-popup-in w-full max-w-md overflow-hidden rounded-2xl border-2 bg-[#FFFDF8] ${
            isCorrect
              ? 'border-[#1C5439] shadow-[0_8px_0_0_#1C5439,0_20px_36px_-12px_rgba(28,84,57,0.45)]'
              : 'border-[#8A2E1D] shadow-[0_8px_0_0_#8A2E1D,0_20px_36px_-12px_rgba(138,46,29,0.45)]'
          }`}
        >
          <div
            className={`px-6 py-5 text-center ${
              isCorrect
                ? 'bg-[#E6F2EB] text-[#143D29]'
                : 'bg-[#FCEBE7] text-[#6B2114]'
            }`}
          >
            <div
              className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl text-[#FFFDF8] ${
                isCorrect ? 'bg-[#266D4B]' : 'bg-[#C44B34]'
              }`}
            >
              {isCorrect ? (
                <CheckCircle2 className="h-8 w-8" />
              ) : (
                <XCircle className="h-8 w-8" />
              )}
            </div>
            <h2
              id="quiz-result-title"
              className="font-display text-2xl font-extrabold"
            >
              {headline}
            </h2>
            {isSpectatorInference && (
              <p className="mt-1 text-xs font-semibold opacity-85">
                Disimpulkan otomatis dari perubahan posisi pion (mode penonton)
              </p>
            )}
          </div>

          <div className="p-6 space-y-4 text-center">
            <div className="studio-tray grid grid-cols-2 divide-x divide-[#D5C7B2] rounded-xl py-3">
              <div>
                <p className="text-xs font-semibold text-[#605549]">
                  Dadu bonus
                </p>
                <p
                  className={`mt-0.5 font-display text-2xl font-extrabold ${
                    isCorrect ? 'text-[#266D4B]' : 'text-[#C44B34]'
                  }`}
                >
                  {isCorrect ? `+${answerResult.bonusDice}` : `-${answerResult.bonusDice}`}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-[#605549]">
                  Perubahan petak
                </p>
                <p className="mt-0.5 font-code text-lg font-bold text-[#1F1A15]">
                  {answerResult.from} → {answerResult.to}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onContinueResult}
              className="btn-tactile inline-flex w-full items-center justify-center gap-2 rounded-xl border-[1.5px] border-[#1F1A15] bg-[#1F1A15] px-5 py-2.5 text-sm font-bold text-[#FFFDF8] shadow-[0_3px_0_0_#4A3E33] hover:bg-[#332A22] cursor-pointer"
            >
              <span>Lanjut</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // FASE 1: Modal Soal Kuis IT Aktif (20 detik)
  // ============================================================================
  if (!question) return null;

  const isAnswering = Boolean(myPlayerId && question.playerId === myPlayerId);
  const targetName =
    players.find((p) => p.playerId === question.playerId)?.name ??
    question.playerId;
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F1A15]/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quiz-modal-title"
    >
      <div className="animate-popup-in w-full max-w-xl overflow-hidden rounded-2xl border-2 border-[#352517] bg-[#FFFDF8] shadow-[0_8px_0_0_#352517,0_20px_36px_-12px_rgba(31,26,21,0.42)]">
        {/* Header Kartu Kuis */}
        <div className="border-b-2 border-[#DFC070] bg-[#F7E3AC] px-5 py-4 text-[#1F1A15]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#B7791F] bg-[#FFFDF8] text-[#B7791F]">
                <Brain className="h-5 w-5" />
              </span>
              <div>
                <h2
                  id="quiz-modal-title"
                  className="font-display text-lg font-extrabold leading-tight"
                >
                  {isAnswering
                    ? 'Jawab Kuis IT'
                    : `${targetName} sedang menjawab soal...`}
                </h2>
                <p className="text-xs font-semibold text-[#7A4F08]">
                  {question.category ?? 'Petak Soal ULTA/1.0'}
                </p>
              </div>
            </div>

            <span
              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 font-code text-sm font-bold ${
                isUrgent
                  ? 'border-[#8A2E1D] bg-[#C44B34] text-[#FFFDF8]'
                  : 'border-[#B7791F]/40 bg-[#FFFDF8] text-[#1F1A15]'
              }`}
            >
              <Clock className="h-4 w-4" />
              <span>{Math.ceil(remainingSec)}d</span>
            </span>
          </div>

          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#E3C87E]">
            <div
              style={{ width: `${progressPct}%` }}
              className={`h-full rounded-full transition-all duration-100 ${
                isUrgent ? 'bg-[#C44B34]' : 'bg-[#266D4B]'
              }`}
            />
          </div>
        </div>

        {/* Isi Soal & Pilihan A-D */}
        <div className="p-5 sm:p-6 space-y-4">
          {!isAnswering && (
            <div className="flex items-center gap-2 rounded-xl border border-[#C0D5E8] bg-[#EAF2FB] px-3.5 py-2.5 text-xs font-semibold text-[#1E4B7A]">
              <Eye className="h-4 w-4 shrink-0" />
              <span>
                Mode penonton: menunggu <strong>{targetName}</strong> memilih
                jawaban.
              </span>
            </div>
          )}

          <p className="text-base font-bold text-[#1F1A15] leading-relaxed sm:text-lg">
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
                      ? 'border-[#1F1A15] bg-[#FDF3D7] shadow-[0_2px_0_0_#1F1A15]'
                      : isAnswering
                        ? 'border-[#D5C7B2] bg-[#FAF5EB] shadow-[0_2px_0_0_#DDD1BE] hover:border-[#1F1A15] hover:bg-[#FFFDF8] cursor-pointer'
                        : 'border-[#E5DAC8] bg-[#FAF5EB]/70 opacity-85 cursor-default'
                  }`}
                >
                  <span
                    className={`flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-lg font-display text-sm font-extrabold ${CHOICE_BADGE[choice]}`}
                  >
                    {choice}
                  </span>
                  <span className="text-sm font-semibold text-[#1F1A15] leading-snug">
                    {question.options[choice]}
                  </span>
                </button>
              );
            })}
          </div>

          {isAnswering && selectedChoice && (
            <p className="flex items-center justify-center gap-1.5 text-xs font-bold text-[#7A4F08]">
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
