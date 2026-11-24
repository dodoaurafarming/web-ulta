import { useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Crown,
  Flag,
  HelpCircle,
} from 'lucide-react';
import type { StageBanner } from '../hooks/usePresentationQueue';
import type { BoardCell, RoomPlayer } from '../types/protocol';
import {
  getPawnClusterOffset,
  getPlayerPalette,
  getTileCenterPercent,
  getTileCenterSvg,
  getVisualGridCells,
} from '../utils/boardGeometry';
import { StagePopupOverlay } from './StagePopupOverlay';

interface GameBoardProps {
  board: BoardCell[];
  players: RoomPlayer[];
  positions: Record<string, number>;
  currentTurnPlayerId: string | null;
  myPlayerId: string | null;
  hoppingPlayerId: string | null;
  highlightedPathKey: string | null;
  stageBanner: StageBanner | null;
}

interface BoardLink {
  key: string;
  type: 'LADDER' | 'SNAKE';
  from: number;
  to: number;
}

const SNAKE_THEMES = [
  { body: '#C44B34', stripe: '#F6D0C6', head: '#8F2F1E' },
  { body: '#8D4B5E', stripe: '#EBD4DB', head: '#5E2E3C' },
  { body: '#406672', stripe: '#CFE1E6', head: '#28454F' },
  { body: '#B56928', stripe: '#F4DFC6', head: '#7E4616' },
  { body: '#A64038', stripe: '#F2C9C5', head: '#732721' },
];

/** Bidak papan nyata bergaya token kayu/enamel board game. */
function SculptedPawnSvg({
  colorHex,
  initial,
  isMe,
}: {
  colorHex: string;
  initial: string;
  isMe: boolean;
}) {
  return (
    <svg
      viewBox="0 0 36 44"
      className="h-7 w-6 sm:h-9 sm:w-7.5 drop-shadow-[0_3px_2px_rgba(31,26,21,0.38)]"
      aria-hidden="true"
    >
      {/* Bayangan alas di permukaan papan */}
      <ellipse cx="18" cy="40.5" rx="12" ry="3" fill="#1F1A15" fillOpacity="0.26" />
      {/* Badan kerucut bidak */}
      <path
        d="M11 20 C10 27 6.5 32 6.5 36.5 C6.5 38.8 11.5 40 18 40 C24.5 40 29.5 38.8 29.5 36.5 C29.5 32 26 27 25 20 Z"
        fill={colorHex}
        stroke={isMe ? '#1F1A15' : '#FFFDF8'}
        strokeWidth={isMe ? '2.2' : '1.8'}
      />
      {/* Kerah cincin halus */}
      <ellipse
        cx="18"
        cy="20.5"
        rx="8.2"
        ry="2.6"
        fill={colorHex}
        stroke="#FFFDF8"
        strokeWidth="1.2"
      />
      {/* Kepala bulat bidak */}
      <circle
        cx="18"
        cy="11.5"
        r="8.5"
        fill={colorHex}
        stroke={isMe ? '#1F1A15' : '#FFFDF8'}
        strokeWidth={isMe ? '2.2' : '1.8'}
      />
      {/* Kilap bevel halus */}
      <path
        d="M13 8.5 A5.5 5.5 0 0 1 18.5 5.5"
        fill="none"
        stroke="#FFFDF8"
        strokeOpacity="0.55"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {/* Inisial pemain */}
      <text
        x="18"
        y="33.5"
        textAnchor="middle"
        fill="#FFFDF8"
        fontSize="11.5"
        fontWeight="800"
        fontFamily="Bricolage Grotesque, sans-serif"
      >
        {initial}
      </text>
    </svg>
  );
}

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

  const trim = Math.min(18, length * 0.1);
  const sx = start.x + ux * trim;
  const sy = start.y + uy * trim;
  const ex = end.x - ux * trim;
  const ey = end.y - uy * trim;
  const innerDx = ex - sx;
  const innerDy = ey - sy;
  const innerLen = Math.hypot(innerDx, innerDy) || 1;

  const halfWidth = 11;
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
        opacity: isHighlighted ? 1 : isDimmed ? 0.25 : 0.88,
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
          stroke="#266D4B"
          strokeOpacity={0.28}
          strokeWidth={34}
          strokeLinecap="round"
        />
      )}

      {rungs.map((r, i) => (
        <g key={i}>
          <line
            x1={r.x1}
            y1={r.y1}
            x2={r.x2}
            y2={r.y2}
            stroke="#5A3A20"
            strokeWidth={5}
            strokeLinecap="round"
          />
          <line
            x1={r.x1}
            y1={r.y1}
            x2={r.x2}
            y2={r.y2}
            stroke="#C99660"
            strokeWidth={2}
            strokeLinecap="round"
          />
        </g>
      ))}

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
            stroke="#1C5439"
            strokeWidth={isHighlighted ? 7 : 5.8}
            strokeLinecap="round"
          />
          <line
            x1={p1.x}
            y1={p1.y}
            x2={p2.x}
            y2={p2.y}
            stroke="#50A076"
            strokeWidth={2}
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

  const wave = Math.min(42, Math.max(20, length * 0.14));
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
        opacity: isHighlighted ? 1 : isDimmed ? 0.25 : 0.88,
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

      <path
        d={d}
        fill="none"
        stroke="#2A1E15"
        strokeOpacity={0.26}
        strokeWidth={isHighlighted ? 13.5 : 11.5}
        strokeLinecap="round"
      />
      <path
        d={d}
        fill="none"
        stroke={theme.body}
        strokeWidth={isHighlighted ? 10.5 : 9}
        strokeLinecap="round"
      />
      <path
        d={d}
        fill="none"
        stroke={theme.stripe}
        strokeWidth={3.2}
        strokeDasharray="6 12"
        strokeLinecap="round"
      />
      <circle cx={tx} cy={ty} r={3.6} fill={theme.body} />

      <g transform={`translate(${hx}, ${hy}) rotate(${angleDeg})`}>
        <ellipse
          cx={0}
          cy={0}
          rx={isHighlighted ? 11 : 10}
          ry={isHighlighted ? 8.4 : 7.6}
          fill={theme.head}
          stroke="#FFFDF8"
          strokeWidth={1.2}
        />
        <circle cx={-2.4} cy={-3} r={2.1} fill="#FFFDF8" />
        <circle cx={-2.4} cy={3} r={2.1} fill="#FFFDF8" />
        <circle cx={-3} cy={-3} r={1.05} fill="#1F1A15" />
        <circle cx={-3} cy={3} r={1.05} fill="#1F1A15" />
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
  hoppingPlayerId,
  highlightedPathKey,
  stageBanner,
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

  const activeLink: BoardLink | null = useMemo(() => {
    if (highlightedPathKey) {
      return (
        [...ladders, ...snakes].find((l) => l.key === highlightedPathKey) ??
        null
      );
    }
    if (hoveredTile !== null) {
      return linkByTile.get(hoveredTile) ?? null;
    }
    return null;
  }, [hoveredTile, linkByTile, highlightedPathKey, ladders, snakes]);

  const groupedByTile = useMemo(() => {
    const map = new Map<number, RoomPlayer[]>();
    for (const player of players) {
      if (player.status === 'left') continue;
      const tile = positions[player.playerId] ?? player.position ?? 1;
      const list = map.get(tile) ?? [];
      list.push(player);
      map.set(tile, list);
    }
    return map;
  }, [players, positions]);

  const questionCount = useMemo(
    () => board.filter((c) => c.type === 'QUESTION').length,
    [board],
  );

  return (
    <div className="flex h-full w-full flex-col items-center justify-center min-h-0">
      {/* Papan 10x10 terkunci agar selalu muat 100% di dalam viewport tanpa scroll */}
      <div
        data-board-frame
        className="board-wood-frame relative aspect-square w-[min(calc(100vw-16px),calc(100dvh-166px))] max-w-full lg:w-auto lg:h-[min(calc(100dvh-106px),760px)] lg:max-w-full rounded-2xl p-1.5 sm:rounded-[20px] sm:p-2.5"
      >
        <div className="relative h-full w-full overflow-hidden rounded-xl border-2 border-[#E3D3B8] bg-[#FAF5EB]">
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

              let tileBg = isEvenCheck ? 'bg-[#FFFDF8]' : 'bg-[#F2E9D9]';
              if (cell.index === 1) {
                tileBg = 'bg-[#E3F1E8]';
              } else if (cell.index === 100) {
                tileBg = 'bg-[#F7E3AC]';
              } else if (cell.type === 'LADDER') {
                tileBg = 'bg-[#E7F3EC]';
              } else if (cell.type === 'SNAKE') {
                tileBg = 'bg-[#FCEBE6]';
              } else if (cell.type === 'QUESTION') {
                tileBg = 'bg-[#FDF3D7]';
              }

              const activeRing = isEndpointActive
                ? activeLink.type === 'LADDER'
                  ? 'ring-2 ring-inset ring-[#266D4B] z-[5]'
                  : 'ring-2 ring-inset ring-[#C44B34] z-[5]'
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
                  className={`relative flex flex-col justify-between border border-[#DDD1BE] p-0.5 sm:p-1 select-none transition-colors ${tileBg} ${activeRing} ${
                    tileLink ? 'cursor-pointer' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span
                      className={`relative z-[15] font-display text-[9px] font-bold leading-none sm:text-[11px] ${
                        cell.index === 100
                          ? 'text-[#7A4F08]'
                          : cell.type === 'SNAKE'
                            ? 'text-[#8F2F1E]'
                            : cell.type === 'LADDER'
                              ? 'text-[#1D5439]'
                              : cell.type === 'QUESTION'
                                ? 'text-[#8A580F]'
                                : 'text-[#5A5045]'
                      }`}
                    >
                      {cell.index}
                    </span>

                    {cell.index === 100 && (
                      <Crown className="h-3 w-3 text-[#B7791F] sm:h-3.5 sm:w-3.5" />
                    )}
                    {cell.index === 1 && (
                      <Flag className="h-3 w-3 text-[#266D4B] sm:h-3.5 sm:w-3.5" />
                    )}
                    {cell.type === 'QUESTION' && (
                      <HelpCircle className="h-3 w-3 text-[#B7791F] sm:h-3.5 sm:w-3.5" />
                    )}
                  </div>

                  <div className="flex items-end justify-end">
                    {cell.type === 'LADDER' && cell.to !== undefined && (
                      <span className="inline-flex items-center rounded bg-[#266D4B] px-1 py-0.5 font-code text-[7px] font-bold leading-none text-[#FFFDF8] sm:text-[8px]">
                        <ArrowUpRight className="hidden h-2.5 w-2.5 sm:inline" />
                        {cell.to}
                      </span>
                    )}
                    {cell.type === 'SNAKE' && cell.to !== undefined && (
                      <span className="inline-flex items-center rounded bg-[#C44B34] px-1 py-0.5 font-code text-[7px] font-bold leading-none text-[#FFFDF8] sm:text-[8px]">
                        <ArrowDownRight className="hidden h-2.5 w-2.5 sm:inline" />
                        {cell.to}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Overlay SVG: Tangga & Ular */}
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
                  stdDeviation="2"
                  floodColor="#2A1E15"
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

          {/* Pion Bidak Nyata */}
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
                    data-pawn={player.playerId}
                    data-pawn-tile={tile}
                    title={`${player.name} — Petak ${tile}`}
                    style={{
                      left: `${leftPct + dxPct}%`,
                      top: `${topPct + dyPct}%`,
                      transition:
                        'left 220ms cubic-bezier(0.22, 1, 0.36, 1), top 220ms cubic-bezier(0.22, 1, 0.36, 1)',
                    }}
                    className={`absolute -translate-x-1/2 -translate-y-[62%] ${
                      isTurn ? 'z-30' : 'z-20'
                    } ${isHopping ? 'animate-pawn-hop' : ''} ${
                      !player.online ? 'opacity-45 grayscale' : ''
                    }`}
                  >
                    {isTurn && (
                      <span className="absolute left-1/2 bottom-0 h-3 w-7 -translate-x-1/2 rounded-full border-2 border-[#C44B34]/80 animate-ping" />
                    )}
                    <SculptedPawnSvg
                      colorHex={palette.hex}
                      initial={player.name.slice(0, 1).toUpperCase()}
                      isMe={isMe}
                    />
                  </div>
                );
              }),
            )}
          </div>

          {/* Pop-up Giliran & Efek Ular/Tangga terpusat di atas papan */}
          <StagePopupOverlay banner={stageBanner} />
        </div>
      </div>

      {/* Bar Keterangan Ringkas Satu Baris di Bawah Papan */}
      <div className="mt-1.5 flex w-full max-w-[760px] items-center justify-between gap-2 px-1 text-[11px] font-semibold text-[#605549]">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1 text-[#1D5439]">
            <ArrowUpRight className="h-3.5 w-3.5" />
            Tangga ({ladders.length})
          </span>
          <span className="inline-flex items-center gap-1 text-[#8F2F1E]">
            <ArrowDownRight className="h-3.5 w-3.5" />
            Ular ({snakes.length})
          </span>
          <span className="inline-flex items-center gap-1 text-[#8A580F]">
            <HelpCircle className="h-3.5 w-3.5" />
            Kuis ({questionCount})
          </span>
        </div>

        <span className="hidden sm:inline truncate text-[11px] font-medium text-[#605549]">
          {activeLink ? (
            activeLink.type === 'LADDER' ? (
              <strong className="text-[#1D5439]">
                Tangga: Petak {activeLink.from} → {activeLink.to}
              </strong>
            ) : (
              <strong className="text-[#8F2F1E]">
                Ular: Petak {activeLink.from} → {activeLink.to}
              </strong>
            )
          ) : (
            'Arahkan kursor ke petak ular/tangga untuk menyorot jalur'
          )}
        </span>
      </div>
    </div>
  );
}
