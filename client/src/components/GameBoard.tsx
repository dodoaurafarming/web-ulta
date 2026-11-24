import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Crown,
  Flag,
  HelpCircle,
} from 'lucide-react';
import type { BoardCell, MoveEvent, RoomPlayer } from '../types/protocol';
import {
  getPawnClusterOffset,
  getPlayerPalette,
  getTileCenterPercent,
  getTileCenterSvg,
  getVisualGridCells,
} from '../utils/boardGeometry';

interface GameBoardProps {
  board: BoardCell[];
  players: RoomPlayer[];
  positions: Record<string, number>;
  currentTurnPlayerId: string | null;
  myPlayerId: string | null;
  lastMove: MoveEvent | null;
}

const SNAKE_THEMES = [
  { body: '#e11d48', stripe: '#fda4af', head: '#be123c' },
  { body: '#7c3aed', stripe: '#ddd6fe', head: '#5b21b6' },
  { body: '#0d9488', stripe: '#99f6e4', head: '#115e59' },
  { body: '#ea580c', stripe: '#fed7aa', head: '#9a3412' },
];

function LadderSvg({
  fromTile,
  toTile,
}: {
  fromTile: number;
  toTile: number;
}) {
  const start = getTileCenterSvg(fromTile);
  const end = getTileCenterSvg(toTile);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  // Normal vektor untuk 2 rel tangga paralel
  const nx = -uy;
  const ny = ux;
  const halfWidth = 14;

  const left1 = { x: start.x + nx * halfWidth, y: start.y + ny * halfWidth };
  const left2 = { x: end.x + nx * halfWidth, y: end.y + ny * halfWidth };
  const right1 = { x: start.x - nx * halfWidth, y: start.y - ny * halfWidth };
  const right2 = { x: end.x - nx * halfWidth, y: end.y - ny * halfWidth };

  const rungCount = Math.max(3, Math.floor(length / 36));
  const rungs = Array.from({ length: rungCount }, (_, idx) => {
    const t = (idx + 1) / (rungCount + 1);
    const cx = start.x + dx * t;
    const cy = start.y + dy * t;
    return {
      x1: cx + nx * halfWidth,
      y1: cy + ny * halfWidth,
      x2: cx - nx * halfWidth,
      y2: cy - ny * halfWidth,
    };
  });

  return (
    <g opacity={0.92} filter="url(#board-shadow)">
      {/* Rungs */}
      {rungs.map((r, i) => (
        <line
          key={i}
          x1={r.x1}
          y1={r.y1}
          x2={r.x2}
          y2={r.y2}
          stroke="#d97706"
          strokeWidth={6}
          strokeLinecap="round"
        />
      ))}
      {/* Parallel Rails */}
      <line
        x1={left1.x}
        y1={left1.y}
        x2={left2.x}
        y2={left2.y}
        stroke="#059669"
        strokeWidth={8}
        strokeLinecap="round"
      />
      <line
        x1={left1.x}
        y1={left1.y}
        x2={left2.x}
        y2={left2.y}
        stroke="#6ee7b7"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <line
        x1={right1.x}
        y1={right1.y}
        x2={right2.x}
        y2={right2.y}
        stroke="#059669"
        strokeWidth={8}
        strokeLinecap="round"
      />
      <line
        x1={right1.x}
        y1={right1.y}
        x2={right2.x}
        y2={right2.y}
        stroke="#6ee7b7"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </g>
  );
}

function SnakeSvg({
  headTile,
  tailTile,
  variantIndex,
}: {
  headTile: number;
  tailTile: number;
  variantIndex: number;
}) {
  const head = getTileCenterSvg(headTile);
  const tail = getTileCenterSvg(tailTile);
  const dx = tail.x - head.x;
  const dy = tail.y - head.y;
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;
  const wave = Math.min(54, Math.max(26, length * 0.16));
  const dir = variantIndex % 2 === 0 ? 1 : -1;

  const cp1x = head.x + dx * 0.33 + nx * wave * dir;
  const cp1y = head.y + dy * 0.33 + ny * wave * dir;
  const cp2x = head.x + dx * 0.68 - nx * wave * dir;
  const cp2y = head.y + dy * 0.68 - ny * wave * dir;

  const d = `M ${head.x} ${head.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${tail.x} ${tail.y}`;
  const theme = SNAKE_THEMES[variantIndex % SNAKE_THEMES.length];

  // Arah kepala ular
  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;

  return (
    <g opacity={0.92} filter="url(#board-shadow)">
      {/* Outline gelap lembut */}
      <path
        d={d}
        fill="none"
        stroke="#0f172a"
        strokeOpacity={0.28}
        strokeWidth={17}
        strokeLinecap="round"
      />
      {/* Badan ular */}
      <path
        d={d}
        fill="none"
        stroke={theme.body}
        strokeWidth={13}
        strokeLinecap="round"
      />
      {/* Pola sisik putus-putus */}
      <path
        d={d}
        fill="none"
        stroke={theme.stripe}
        strokeWidth={5}
        strokeDasharray="8 14"
        strokeLinecap="round"
      />
      {/* Ujung ekor */}
      <circle cx={tail.x} cy={tail.y} r={5} fill={theme.body} />

      {/* Kepala ular */}
      <g transform={`translate(${head.x}, ${head.y}) rotate(${angleDeg})`}>
        {/* Lidah bercabang */}
        <path
          d="M -13 0 L -22 0 M -22 0 L -26 -4 M -22 0 L -26 4"
          stroke="#fb7185"
          strokeWidth={2.4}
          strokeLinecap="round"
          fill="none"
        />
        <ellipse cx={0} cy={0} rx={14} ry={11} fill={theme.head} />
        <circle cx={-3} cy={-4.5} r={3.2} fill="#ffffff" />
        <circle cx={-3} cy={4.5} r={3.2} fill="#ffffff" />
        <circle cx={-4} cy={-4.5} r={1.6} fill="#0f172a" />
        <circle cx={-4} cy={4.5} r={1.6} fill="#0f172a" />
      </g>
    </g>
  );
}

export function GameBoard({
  board,
  players,
  positions,
  currentTurnPlayerId,
  myPlayerId,
  lastMove,
}: GameBoardProps) {
  const orderedCells = useMemo(() => getVisualGridCells(board), [board]);

  const ladders = useMemo(
    () =>
      board.filter(
        (c): c is BoardCell & { to: number } =>
          c.type === 'LADDER' && typeof c.to === 'number' && c.to > c.index,
      ),
    [board],
  );

  const snakes = useMemo(
    () =>
      board.filter(
        (c): c is BoardCell & { to: number } =>
          c.type === 'SNAKE' && typeof c.to === 'number' && c.to < c.index,
      ),
    [board],
  );

  const [visualPositions, setVisualPositions] =
    useState<Record<string, number>>(positions);
  const [hoppingPlayerId, setHoppingPlayerId] = useState<string | null>(null);
  const animTimersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const lastAnimatedMoveRef = useRef<MoveEvent | null>(null);

  // Sinkronkan posisi pemain yang sedang tidak beranimasi
  useEffect(() => {
    setVisualPositions((prev) => {
      const next: Record<string, number> = { ...prev };
      for (const [pid, pos] of Object.entries(positions)) {
        if (pid !== hoppingPlayerId || next[pid] === undefined) {
          next[pid] = pos;
        }
      }
      return next;
    });
  }, [positions, hoppingPlayerId]);

  // Animasikan langkah pion mengikuti array `path` dari event MOVE
  useEffect(() => {
    if (!lastMove || lastMove === lastAnimatedMoveRef.current) return;
    lastAnimatedMoveRef.current = lastMove;

    for (const t of animTimersRef.current) clearTimeout(t);
    animTimersRef.current = [];

    const steps = lastMove.path.length > 0 ? lastMove.path : [lastMove.to];
    const pid = lastMove.playerId;

    setHoppingPlayerId(pid);
    setVisualPositions((prev) => ({ ...prev, [pid]: lastMove.from }));

    const stepMs = 145;
    steps.forEach((tile, idx) => {
      const timer = setTimeout(() => {
        setVisualPositions((prev) => ({ ...prev, [pid]: tile }));
      }, (idx + 1) * stepMs);
      animTimersRef.current.push(timer);
    });

    const lastStep = steps[steps.length - 1];
    const hasJump = lastStep !== lastMove.to;
    const finishDelay =
      (steps.length + 1) * stepMs + (hasJump ? 210 : 60);

    if (hasJump) {
      const jumpTimer = setTimeout(() => {
        setVisualPositions((prev) => ({ ...prev, [pid]: lastMove.to }));
      }, steps.length * stepMs + 190);
      animTimersRef.current.push(jumpTimer);
    }

    const doneTimer = setTimeout(() => {
      setVisualPositions((prev) => ({
        ...prev,
        [pid]: positions[pid] ?? lastMove.to,
      }));
      setHoppingPlayerId(null);
    }, finishDelay);
    animTimersRef.current.push(doneTimer);

    return () => {
      for (const t of animTimersRef.current) clearTimeout(t);
      animTimersRef.current = [];
    };
  }, [lastMove, positions]);

  // Kelompokkan pion per petak untuk offset rapi saat menumpuk
  const groupedByTile = useMemo(() => {
    const map = new Map<number, RoomPlayer[]>();
    for (const player of players) {
      if (player.status === 'left') continue;
      const tile =
        visualPositions[player.playerId] ??
        positions[player.playerId] ??
        player.position ??
        1;
      const list = map.get(tile) ?? [];
      list.push(player);
      map.set(tile, list);
    }
    return map;
  }, [players, visualPositions, positions]);

  return (
    <div className="w-full">
      {/* Board Frame */}
      <div className="relative mx-auto aspect-square w-full max-w-[680px] rounded-3xl border-4 border-amber-400 bg-amber-300 p-1.5 shadow-2xl shadow-amber-900/15 sm:p-2.5">
        <div className="relative h-full w-full overflow-hidden rounded-2xl border-2 border-amber-500/40 bg-white">
          {/* 10x10 Zig-Zag Grid */}
          <div className="grid h-full w-full grid-cols-10 grid-rows-10">
            {orderedCells.map((cell, gridIdx) => {
              const row = Math.floor(gridIdx / 10);
              const col = gridIdx % 10;
              const isEvenCheck = (row + col) % 2 === 0;

              let tileBg = isEvenCheck ? 'bg-amber-50/90' : 'bg-sky-50/85';
              if (cell.index === 1) {
                tileBg = 'bg-gradient-to-br from-emerald-200 to-teal-100';
              } else if (cell.index === 100) {
                tileBg = 'bg-gradient-to-br from-amber-300 via-yellow-200 to-orange-200';
              } else if (cell.type === 'LADDER') {
                tileBg = 'bg-emerald-100/90';
              } else if (cell.type === 'SNAKE') {
                tileBg = 'bg-rose-100/90';
              } else if (cell.type === 'QUESTION') {
                tileBg = 'bg-gradient-to-br from-violet-100 to-amber-100';
              }

              return (
                <div
                  key={cell.index}
                  data-tile={cell.index}
                  data-tile-type={cell.type}
                  className={`relative flex flex-col justify-between border border-amber-900/10 p-0.5 sm:p-1 select-none ${tileBg}`}
                >
                  {/* Nomor Petak */}
                  <div className="flex items-start justify-between">
                    <span
                      className={`font-display text-[9px] font-bold leading-none sm:text-xs ${
                        cell.index === 100
                          ? 'text-amber-900'
                          : cell.type === 'SNAKE'
                            ? 'text-rose-800'
                            : cell.type === 'LADDER'
                              ? 'text-emerald-800'
                              : cell.type === 'QUESTION'
                                ? 'text-violet-800'
                                : 'text-slate-600'
                      }`}
                    >
                      {cell.index}
                    </span>

                    {cell.index === 100 && (
                      <Crown className="h-3 w-3 text-amber-600 sm:h-4 sm:w-4" />
                    )}
                    {cell.index === 1 && (
                      <Flag className="h-3 w-3 text-emerald-700 sm:h-3.5 sm:w-3.5" />
                    )}
                    {cell.type === 'QUESTION' && (
                      <HelpCircle className="h-3 w-3 text-violet-600 sm:h-4 sm:w-4" />
                    )}
                  </div>

                  {/* Badge Efek Petak */}
                  <div className="flex items-end justify-end">
                    {cell.type === 'LADDER' && cell.to !== undefined && (
                      <span className="inline-flex items-center rounded bg-emerald-600/90 px-1 py-0.5 text-[8px] font-extrabold leading-none text-white sm:text-[9px]">
                        <ArrowUpRight className="h-2.5 w-2.5 hidden sm:inline" />
                        {cell.to}
                      </span>
                    )}
                    {cell.type === 'SNAKE' && cell.to !== undefined && (
                      <span className="inline-flex items-center rounded bg-rose-600/90 px-1 py-0.5 text-[8px] font-extrabold leading-none text-white sm:text-[9px]">
                        <ArrowDownRight className="h-2.5 w-2.5 hidden sm:inline" />
                        {cell.to}
                      </span>
                    )}
                    {cell.type === 'QUESTION' && (
                      <span className="rounded bg-violet-600 px-1 py-0.5 text-[7px] font-extrabold uppercase leading-none text-white sm:text-[8px]">
                        KUIS
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* SVG Overlay: Tangga & Ular */}
          <svg
            viewBox="0 0 1000 1000"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 z-10 h-full w-full"
            aria-hidden="true"
          >
            <defs>
              <filter
                id="board-shadow"
                x="-15%"
                y="-15%"
                width="130%"
                height="130%"
              >
                <feDropShadow
                  dx="0"
                  dy="3"
                  stdDeviation="3"
                  floodColor="#0f172a"
                  floodOpacity="0.22"
                />
              </filter>
            </defs>

            {ladders.map((cell) => (
              <LadderSvg
                key={`ladder-${cell.index}-${cell.to}`}
                fromTile={cell.index}
                toTile={cell.to}
              />
            ))}

            {snakes.map((cell, idx) => (
              <SnakeSvg
                key={`snake-${cell.index}-${cell.to}`}
                headTile={cell.index}
                tailTile={cell.to}
                variantIndex={idx}
              />
            ))}
          </svg>

          {/* Animated Pawns Layer */}
          <div className="pointer-events-none absolute inset-0 z-20">
            {Array.from(groupedByTile.entries()).flatMap(([tile, group]) =>
              group.map((player, slotIndex) => {
                const { leftPct, topPct } = getTileCenterPercent(tile);
                const { dxPct, dyPct } = getPawnClusterOffset(
                  slotIndex,
                  group.length,
                );
                const palette = getPlayerPalette(player.colorIndex);
                const isTurn = player.playerId === currentTurnPlayerId;
                const isMe = player.playerId === myPlayerId;
                const isHopping = player.playerId === hoppingPlayerId;

                return (
                  <div
                    key={player.playerId}
                    title={`${player.name} — Petak ${tile}`}
                    style={{
                      left: `${leftPct + dxPct}%`,
                      top: `${topPct + dyPct}%`,
                      transition:
                        'left 140ms cubic-bezier(0.22, 1, 0.36, 1), top 140ms cubic-bezier(0.22, 1, 0.36, 1)',
                    }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 ${
                      isTurn ? 'z-30' : 'z-20'
                    } ${isHopping ? 'animate-pawn-hop' : ''}`}
                  >
                    {isTurn && (
                      <span
                        className={`absolute -inset-1.5 rounded-full opacity-60 animate-ping ${palette.bg}`}
                      />
                    )}
                    <div
                      className={`relative flex h-6 w-6 items-center justify-center rounded-full border-2 border-white font-display text-[10px] font-bold text-white shadow-lg sm:h-8 sm:w-8 sm:text-xs ${
                        palette.bg
                      } ${isMe ? 'ring-2 ring-amber-300' : ''} ${
                        !player.online ? 'opacity-50 grayscale' : ''
                      }`}
                    >
                      {player.name.slice(0, 1).toUpperCase()}
                    </div>
                  </div>
                );
              }),
            )}
          </div>
        </div>
      </div>

      {/* Legend Bar */}
      <div className="mx-auto mt-3 flex max-w-[680px] flex-wrap items-center justify-center gap-2 text-[11px] font-bold text-slate-600">
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-800">
          <ArrowUpRight className="h-3.5 w-3.5" />
          Tangga ({ladders.length})
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-rose-800">
          <ArrowDownRight className="h-3.5 w-3.5" />
          Ular ({snakes.length})
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-violet-800">
          <HelpCircle className="h-3.5 w-3.5" />
          Kuis IT ({board.filter((c) => c.type === 'QUESTION').length})
        </span>
      </div>
    </div>
  );
}
