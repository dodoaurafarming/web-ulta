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

interface BoardLink {
  key: string;
  type: 'LADDER' | 'SNAKE';
  from: number;
  to: number;
}

/** Palet ular bernuansa tabletop earthy — tajam namun tidak neon/berisik. */
const SNAKE_THEMES = [
  { body: '#C8523B', stripe: '#F6CFC6', head: '#963826' },
  { body: '#8D4B5E', stripe: '#EBD3DA', head: '#633140' },
  { body: '#456873', stripe: '#CFE0E5', head: '#2E4952' },
  { body: '#B56B2A', stripe: '#F5DEC4', head: '#824A19' },
  { body: '#A8423A', stripe: '#F3C8C4', head: '#782B25' },
];

function LadderSvg({
  fromTile,
  toTile,
  isHighlighted,
  isDimmed,
}: {
  fromTile: number;
  toTile: number;
  isHighlighted: boolean;
  isDimmed: boolean;
}) {
  const start = getTileCenterSvg(fromTile);
  const end = getTileCenterSvg(toTile);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  const nx = -uy;
  const ny = ux;

  // Geser ujung sedikit masuk agar tidak menabrak tepi petak atau angka
  const trim = Math.min(18, length * 0.1);
  const sx = start.x + ux * trim;
  const sy = start.y + uy * trim;
  const ex = end.x - ux * trim;
  const ey = end.y - uy * trim;
  const innerDx = ex - sx;
  const innerDy = ey - sy;
  const innerLen = Math.hypot(innerDx, innerDy) || 1;

  const halfWidth = 11.5;
  const left1 = { x: sx + nx * halfWidth, y: sy + ny * halfWidth };
  const left2 = { x: ex + nx * halfWidth, y: ey + ny * halfWidth };
  const right1 = { x: sx - nx * halfWidth, y: sy - ny * halfWidth };
  const right2 = { x: ex - nx * halfWidth, y: ey - ny * halfWidth };

  const rungCount = Math.max(3, Math.floor(innerLen / 34));
  const rungs = Array.from({ length: rungCount }, (_, idx) => {
    const t = (idx + 1) / (rungCount + 1);
    const cx = sx + innerDx * t;
    const cy = sy + innerDy * t;
    return {
      x1: cx + nx * (halfWidth - 1),
      y1: cy + ny * (halfWidth - 1),
      x2: cx - nx * (halfWidth - 1),
      y2: cy - ny * (halfWidth - 1),
    };
  });

  return (
    <g
      style={{
        opacity: isHighlighted ? 1 : isDimmed ? 0.28 : 0.88,
        transition: 'opacity 180ms ease',
      }}
      filter="url(#tabletop-shadow)"
    >
      {isHighlighted && (
        <line
          x1={sx}
          y1={sy}
          x2={ex}
          y2={ey}
          stroke="#2F7D57"
          strokeOpacity={0.28}
          strokeWidth={34}
          strokeLinecap="round"
        />
      )}

      {/* Anak tangga geometris */}
      {rungs.map((r, i) => (
        <g key={i}>
          <line
            x1={r.x1}
            y1={r.y1}
            x2={r.x2}
            y2={r.y2}
            stroke="#5C3D24"
            strokeWidth={5.2}
            strokeLinecap="round"
          />
          <line
            x1={r.x1}
            y1={r.y1}
            x2={r.x2}
            y2={r.y2}
            stroke="#C79663"
            strokeWidth={2.2}
            strokeLinecap="round"
          />
        </g>
      ))}

      {/* Rel kayu kiri & kanan dengan aksen hijau sage */}
      {[
        [left1, left2],
        [right1, right2],
      ].map(([p1, p2], idx) => (
        <g key={idx}>
          <line
            x1={p1.x}
            y1={p1.y}
            x2={p2.x}
            y2={p2.y}
            stroke="#1F5C40"
            strokeWidth={isHighlighted ? 7.2 : 6}
            strokeLinecap="round"
          />
          <line
            x1={p1.x}
            y1={p1.y}
            x2={p2.x}
            y2={p2.y}
            stroke="#4EA076"
            strokeWidth={2.2}
            strokeLinecap="round"
          />
        </g>
      ))}
    </g>
  );
}

function SnakeSvg({
  headTile,
  tailTile,
  variantIndex,
  isHighlighted,
  isDimmed,
}: {
  headTile: number;
  tailTile: number;
  variantIndex: number;
  isHighlighted: boolean;
  isDimmed: boolean;
}) {
  const head = getTileCenterSvg(headTile);
  const tail = getTileCenterSvg(tailTile);
  const dx = tail.x - head.x;
  const dy = tail.y - head.y;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  const nx = -uy;
  const ny = ux;

  const trimHead = Math.min(10, length * 0.06);
  const trimTail = Math.min(16, length * 0.09);
  const hx = head.x + ux * trimHead;
  const hy = head.y + uy * trimHead;
  const tx = tail.x - ux * trimTail;
  const ty = tail.y - uy * trimTail;
  const spanDx = tx - hx;
  const spanDy = ty - hy;

  const wave = Math.min(44, Math.max(22, length * 0.14));
  const dir = variantIndex % 2 === 0 ? 1 : -1;

  const cp1x = hx + spanDx * 0.34 + nx * wave * dir;
  const cp1y = hy + spanDy * 0.34 + ny * wave * dir;
  const cp2x = hx + spanDx * 0.68 - nx * wave * dir;
  const cp2y = hy + spanDy * 0.68 - ny * wave * dir;

  const d = `M ${hx} ${hy} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${tx} ${ty}`;
  const theme = SNAKE_THEMES[variantIndex % SNAKE_THEMES.length];
  const angleDeg = (Math.atan2(cp1y - hy, cp1x - hx) * 180) / Math.PI;

  return (
    <g
      style={{
        opacity: isHighlighted ? 1 : isDimmed ? 0.28 : 0.88,
        transition: 'opacity 180ms ease',
      }}
      filter="url(#tabletop-shadow)"
    >
      {isHighlighted && (
        <path
          d={d}
          fill="none"
          stroke={theme.body}
          strokeOpacity={0.26}
          strokeWidth={24}
          strokeLinecap="round"
        />
      )}

      {/* Outline ink tipis */}
      <path
        d={d}
        fill="none"
        stroke="#2C2621"
        strokeOpacity={0.28}
        strokeWidth={isHighlighted ? 14 : 12}
        strokeLinecap="round"
      />
      {/* Badan ular */}
      <path
        d={d}
        fill="none"
        stroke={theme.body}
        strokeWidth={isHighlighted ? 11 : 9.5}
        strokeLinecap="round"
      />
      {/* Aksen sisik geometris halus */}
      <path
        d={d}
        fill="none"
        stroke={theme.stripe}
        strokeWidth={3.4}
        strokeDasharray="6 12"
        strokeLinecap="round"
      />
      {/* Ujung ekor meruncing */}
      <circle cx={tx} cy={ty} r={3.8} fill={theme.body} />

      {/* Kepala ular proporsional & bersih */}
      <g transform={`translate(${hx}, ${hy}) rotate(${angleDeg})`}>
        <ellipse
          cx={0}
          cy={0}
          rx={isHighlighted ? 11.5 : 10.5}
          ry={isHighlighted ? 8.8 : 8}
          fill={theme.head}
          stroke="#FFFDF8"
          strokeWidth={1.2}
        />
        <circle cx={-2.5} cy={-3.2} r={2.2} fill="#FFFDF8" />
        <circle cx={-2.5} cy={3.2} r={2.2} fill="#FFFDF8" />
        <circle cx={-3.1} cy={-3.2} r={1.1} fill="#1F1B17" />
        <circle cx={-3.1} cy={3.2} r={1.1} fill="#1F1B17" />
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

  const ladders = useMemo<BoardLink[]>(
    () =>
      board
        .filter(
          (c): c is BoardCell & { to: number } =>
            c.type === 'LADDER' && typeof c.to === 'number' && c.to > c.index,
        )
        .map((c) => ({
          key: `LADDER-${c.index}-${c.to}`,
          type: 'LADDER',
          from: c.index,
          to: c.to,
        })),
    [board],
  );

  const snakes = useMemo<BoardLink[]>(
    () =>
      board
        .filter(
          (c): c is BoardCell & { to: number } =>
            c.type === 'SNAKE' && typeof c.to === 'number' && c.to < c.index,
        )
        .map((c) => ({
          key: `SNAKE-${c.index}-${c.to}`,
          type: 'SNAKE',
          from: c.index,
          to: c.to,
        })),
    [board],
  );

  const linkByTile = useMemo(() => {
    const map = new Map<number, BoardLink>();
    for (const link of [...ladders, ...snakes]) {
      map.set(link.from, link);
      if (!map.has(link.to)) {
        map.set(link.to, link);
      }
    }
    return map;
  }, [ladders, snakes]);

  const [hoveredTile, setHoveredTile] = useState<number | null>(null);
  const [landingHighlightKey, setLandingHighlightKey] = useState<string | null>(
    null,
  );

  const [visualPositions, setVisualPositions] =
    useState<Record<string, number>>(positions);
  const [hoppingPlayerId, setHoppingPlayerId] = useState<string | null>(null);
  const animTimersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const lastAnimatedMoveRef = useRef<MoveEvent | null>(null);

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

  // Animasikan langkah pion mengikuti array `path` + sorot jalur ular/tangga saat mendarat
  useEffect(() => {
    if (!lastMove || lastMove === lastAnimatedMoveRef.current) return;
    lastAnimatedMoveRef.current = lastMove;

    for (const t of animTimersRef.current) clearTimeout(t);
    animTimersRef.current = [];

    const steps = lastMove.path.length > 0 ? lastMove.path : [lastMove.to];
    const pid = lastMove.playerId;

    setHoppingPlayerId(pid);
    setVisualPositions((prev) => ({ ...prev, [pid]: lastMove.from }));

    const stepMs = 140;
    steps.forEach((tile, idx) => {
      const timer = setTimeout(() => {
        setVisualPositions((prev) => ({ ...prev, [pid]: tile }));
      }, (idx + 1) * stepMs);
      animTimersRef.current.push(timer);
    });

    const lastStep = steps[steps.length - 1];
    const hasJump = lastStep !== lastMove.to;
    const landedLink =
      lastMove.effect === 'SNAKE' || lastMove.effect === 'LADDER'
        ? `${lastMove.effect}-${lastStep}-${lastMove.to}`
        : null;

    if (landedLink) {
      const highlightStart = setTimeout(() => {
        setLandingHighlightKey(landedLink);
      }, steps.length * stepMs);
      animTimersRef.current.push(highlightStart);

      const highlightEnd = setTimeout(() => {
        setLandingHighlightKey((curr) => (curr === landedLink ? null : curr));
      }, steps.length * stepMs + 2_000);
      animTimersRef.current.push(highlightEnd);
    }

    if (hasJump) {
      const jumpTimer = setTimeout(() => {
        setVisualPositions((prev) => ({ ...prev, [pid]: lastMove.to }));
      }, steps.length * stepMs + 190);
      animTimersRef.current.push(jumpTimer);
    }

    const finishDelay =
      (steps.length + 1) * stepMs + (hasJump ? 220 : 60);
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

  const activeLink: BoardLink | null = useMemo(() => {
    if (hoveredTile !== null) {
      return linkByTile.get(hoveredTile) ?? null;
    }
    if (landingHighlightKey) {
      return (
        [...ladders, ...snakes].find((l) => l.key === landingHighlightKey) ??
        null
      );
    }
    return null;
  }, [hoveredTile, linkByTile, landingHighlightKey, ladders, snakes]);

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

  const questionCount = useMemo(
    () => board.filter((c) => c.type === 'QUESTION').length,
    [board],
  );

  return (
    <div className="w-full">
      {/* Bingkai Papan Kayu Walnut Tabletop */}
      <div className="board-wood-frame relative mx-auto aspect-square w-full max-w-[700px] lg:max-w-[min(700px,calc(100vh-170px))] rounded-2xl p-2 sm:rounded-[22px] sm:p-3">
        {/* Mat Krem Bagian Dalam */}
        <div className="relative h-full w-full overflow-hidden rounded-xl border-2 border-[#E5D7BE] bg-[#FAF6EE]">
          {/* Grid 10x10 Zig-Zag */}
          <div className="grid h-full w-full grid-cols-10 grid-rows-10">
            {orderedCells.map((cell, gridIdx) => {
              const row = Math.floor(gridIdx / 10);
              const col = gridIdx % 10;
              const isEvenCheck = (row + col) % 2 === 0;
              const tileLink = linkByTile.get(cell.index);
              const isEndpointActive =
                activeLink !== null &&
                (activeLink.from === cell.index || activeLink.to === cell.index);

              let tileBg = isEvenCheck ? 'bg-[#FFFDF8]' : 'bg-[#F3ECE0]';
              if (cell.index === 1) {
                tileBg = 'bg-[#E6F2EB]';
              } else if (cell.index === 100) {
                tileBg = 'bg-[#F8E7B4]';
              } else if (cell.type === 'LADDER') {
                tileBg = 'bg-[#E9F4ED]';
              } else if (cell.type === 'SNAKE') {
                tileBg = 'bg-[#FCECE8]';
              } else if (cell.type === 'QUESTION') {
                tileBg = 'bg-[#FDF4DC]';
              }

              const activeRing = isEndpointActive
                ? activeLink.type === 'LADDER'
                  ? 'ring-2 ring-inset ring-[#2F7D57] z-[5]'
                  : 'ring-2 ring-inset ring-[#C8523B] z-[5]'
                : '';

              return (
                <div
                  key={cell.index}
                  data-tile={cell.index}
                  data-tile-type={cell.type}
                  onMouseEnter={() => {
                    if (tileLink) setHoveredTile(cell.index);
                  }}
                  onMouseLeave={() => {
                    if (hoveredTile === cell.index) setHoveredTile(null);
                  }}
                  onClick={() => {
                    if (!tileLink) {
                      setHoveredTile(null);
                      return;
                    }
                    setHoveredTile((prev) =>
                      prev === cell.index ? null : cell.index,
                    );
                  }}
                  className={`relative flex flex-col justify-between border border-[#DFD5C5] p-0.5 sm:p-1 select-none transition-colors ${tileBg} ${activeRing} ${
                    tileLink ? 'cursor-pointer' : ''
                  }`}
                >
                  {/* Pojok kiri-atas khusus nomor petak agar selalu bersih & terbaca */}
                  <div className="flex items-start justify-between">
                    <span
                      className={`relative z-[15] rounded px-0.5 font-display text-[9px] font-bold leading-none sm:text-[11px] ${
                        cell.index === 100
                          ? 'text-[#7D530B]'
                          : cell.type === 'SNAKE'
                            ? 'text-[#963826]'
                            : cell.type === 'LADDER'
                              ? 'text-[#1F5C40]'
                              : cell.type === 'QUESTION'
                                ? 'text-[#8C5B12]'
                                : 'text-[#5A5045]'
                      }`}
                    >
                      {cell.index}
                    </span>

                    {cell.index === 100 && (
                      <Crown className="h-3 w-3 text-[#B7791F] sm:h-3.5 sm:w-3.5" />
                    )}
                    {cell.index === 1 && (
                      <Flag className="h-3 w-3 text-[#2F7D57] sm:h-3.5 sm:w-3.5" />
                    )}
                    {cell.type === 'QUESTION' && (
                      <HelpCircle className="h-3 w-3 text-[#B7791F] sm:h-3.5 sm:w-3.5" />
                    )}
                  </div>

                  {/* Penanda tujuan ringkas di sudut kanan-bawah */}
                  <div className="flex items-end justify-end">
                    {cell.type === 'LADDER' && cell.to !== undefined && (
                      <span className="inline-flex items-center rounded bg-[#2F7D57] px-1 py-0.5 font-code text-[7px] font-bold leading-none text-[#FFFDF8] sm:text-[8px]">
                        <ArrowUpRight className="hidden h-2.5 w-2.5 sm:inline" />
                        {cell.to}
                      </span>
                    )}
                    {cell.type === 'SNAKE' && cell.to !== undefined && (
                      <span className="inline-flex items-center rounded bg-[#C8523B] px-1 py-0.5 font-code text-[7px] font-bold leading-none text-[#FFFDF8] sm:text-[8px]">
                        <ArrowDownRight className="hidden h-2.5 w-2.5 sm:inline" />
                        {cell.to}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Overlay SVG: Tangga & Ular Dinamis */}
          <svg
            viewBox="0 0 1000 1000"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 z-10 h-full w-full"
            aria-hidden="true"
          >
            <defs>
              <filter
                id="tabletop-shadow"
                x="-12%"
                y="-12%"
                width="124%"
                height="124%"
              >
                <feDropShadow
                  dx="0"
                  dy="2"
                  stdDeviation="2.2"
                  floodColor="#2C2621"
                  floodOpacity="0.18"
                />
              </filter>
            </defs>

            {ladders.map((link) => (
              <LadderSvg
                key={link.key}
                fromTile={link.from}
                toTile={link.to}
                isHighlighted={activeLink?.key === link.key}
                isDimmed={activeLink !== null && activeLink.key !== link.key}
              />
            ))}

            {snakes.map((link, idx) => (
              <SnakeSvg
                key={link.key}
                headTile={link.from}
                tailTile={link.to}
                variantIndex={idx}
                isHighlighted={activeLink?.key === link.key}
                isDimmed={activeLink !== null && activeLink.key !== link.key}
              />
            ))}
          </svg>

          {/* Pion Pemain Bergaya Token Kayu */}
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
                        'left 135ms cubic-bezier(0.22, 1, 0.36, 1), top 135ms cubic-bezier(0.22, 1, 0.36, 1)',
                    }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 ${
                      isTurn ? 'z-30' : 'z-20'
                    } ${isHopping ? 'animate-pawn-hop' : ''}`}
                  >
                    {isTurn && (
                      <span
                        className="absolute -inset-1.5 rounded-full border-2 border-[#1F1B17]/35 animate-ping"
                      />
                    )}
                    <div
                      className={`relative flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#FFFDF8] font-display text-[10px] font-extrabold text-[#FFFDF8] shadow-[0_2px_0_0_rgba(31,27,23,0.45)] sm:h-7.5 sm:w-7.5 sm:text-xs ${
                        palette.bg
                      } ${isMe ? 'ring-2 ring-[#1F1B17]' : ''} ${
                        !player.online ? 'opacity-45 grayscale' : ''
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

      {/* Bar Keterangan Papan & Sorot Jalur */}
      <div className="mx-auto mt-3 flex max-w-[700px] lg:max-w-[min(700px,calc(100vh-170px))] flex-wrap items-center justify-between gap-2 px-1 text-[11px] font-semibold text-[#645A4E]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-md border border-[#BBDAC8] bg-[#E6F2EB] px-2 py-0.5 text-[#1F5C40]">
            <ArrowUpRight className="h-3.5 w-3.5" />
            Tangga ({ladders.length})
          </span>
          <span className="inline-flex items-center gap-1 rounded-md border border-[#ECC1B7] bg-[#FCEBE7] px-2 py-0.5 text-[#963826]">
            <ArrowDownRight className="h-3.5 w-3.5" />
            Ular ({snakes.length})
          </span>
          <span className="inline-flex items-center gap-1 rounded-md border border-[#E7CB82] bg-[#FDF3D7] px-2 py-0.5 text-[#8C5B12]">
            <HelpCircle className="h-3.5 w-3.5" />
            Kuis IT ({questionCount})
          </span>
        </div>

        <span className="text-[11px] font-semibold text-[#5A5045]">
          {activeLink ? (
            activeLink.type === 'LADDER' ? (
              <span className="text-[#1F5C40]">
                Tangga: Petak {activeLink.from} → Petak {activeLink.to}
              </span>
            ) : (
              <span className="text-[#963826]">
                Ular: Petak {activeLink.from} → Petak {activeLink.to}
              </span>
            )
          ) : (
            <span>Arahkan kursor atau ketuk ular/tangga untuk menyorot jalur</span>
          )}
        </span>
      </div>
    </div>
  );
}
