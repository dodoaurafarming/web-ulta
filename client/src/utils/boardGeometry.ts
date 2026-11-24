import type { BoardCell } from '../types/protocol';

export interface PlayerPalette {
  name: string;
  bg: string;
  border: string;
  ring: string;
  badgeBg: string;
  badgeText: string;
  hex: string;
}

export const PLAYER_PALETTES: PlayerPalette[] = [
  {
    name: 'Coral',
    bg: 'bg-rose-500',
    border: 'border-rose-700',
    ring: 'ring-rose-300',
    badgeBg: 'bg-rose-100',
    badgeText: 'text-rose-800',
    hex: '#f43f5e',
  },
  {
    name: 'Sky',
    bg: 'bg-sky-500',
    border: 'border-sky-700',
    ring: 'ring-sky-300',
    badgeBg: 'bg-sky-100',
    badgeText: 'text-sky-800',
    hex: '#0ea5e9',
  },
  {
    name: 'Emerald',
    bg: 'bg-emerald-500',
    border: 'border-emerald-700',
    ring: 'ring-emerald-300',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-800',
    hex: '#10b981',
  },
  {
    name: 'Violet',
    bg: 'bg-violet-500',
    border: 'border-violet-700',
    ring: 'ring-violet-300',
    badgeBg: 'bg-violet-100',
    badgeText: 'text-violet-800',
    hex: '#8b5cf6',
  },
  {
    name: 'Amber',
    bg: 'bg-amber-500',
    border: 'border-amber-700',
    ring: 'ring-amber-300',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800',
    hex: '#f59e0b',
  },
];

export function getPlayerPalette(colorIndex: number): PlayerPalette {
  const safe = Math.abs(colorIndex) % PLAYER_PALETTES.length;
  return PLAYER_PALETTES[safe];
}

export interface TileGridCoords {
  /** Baris dari bawah sesuai BLUEPRINT (0 = baris paling bawah, 9 = paling atas) */
  rowFromBottom: number;
  /** Baris visual CSS grid (0 = paling atas, 9 = paling bawah) */
  visualRow: number;
  /** Kolom visual CSS grid (0 = paling kiri, 9 = paling kanan) */
  col: number;
}

/**
 * Konversi nomor petak n (1..100) ke koordinat zig-zag 10x10:
 * - Petak 1 di kiri bawah (rowFromBottom=0, col=0)
 * - Petak 100 di kiri atas (rowFromBottom=9, col=0)
 */
export function getTileCoords(tileNumber: number): TileGridCoords {
  const clamped = Math.max(1, Math.min(100, Math.round(tileNumber)));
  const rowFromBottom = Math.floor((clamped - 1) / 10);
  let col = (clamped - 1) % 10;
  if (rowFromBottom % 2 === 1) {
    col = 9 - col;
  }
  const visualRow = 9 - rowFromBottom;
  return { rowFromBottom, visualRow, col };
}

/**
 * Titik tengah petak dalam koordinat SVG 1000x1000 (tiap petak 100x100).
 */
export function getTileCenterSvg(tileNumber: number): { x: number; y: number } {
  const { visualRow, col } = getTileCoords(tileNumber);
  return {
    x: col * 100 + 50,
    y: visualRow * 100 + 50,
  };
}

/**
 * Titik tengah petak dalam persentase (0..100) untuk posisi pion CSS.
 */
export function getTileCenterPercent(tileNumber: number): {
  leftPct: number;
  topPct: number;
} {
  const { visualRow, col } = getTileCoords(tileNumber);
  return {
    leftPct: col * 10 + 5,
    topPct: visualRow * 10 + 5,
  };
}

/**
 * Menghasilkan 100 sel papan terurut dari kiri atas (petak 100) ke kanan bawah (petak 10)
 * hingga kiri bawah (petak 1) untuk dirender langsung oleh CSS Grid 10 kolom.
 */
export function getVisualGridCells(board: BoardCell[]): BoardCell[] {
  const byIndex = new Map<number, BoardCell>();
  for (const cell of board) {
    byIndex.set(cell.index, cell);
  }

  const ordered: BoardCell[] = [];
  for (let visualRow = 0; visualRow < 10; visualRow += 1) {
    const rowFromBottom = 9 - visualRow;
    for (let col = 0; col < 10; col += 1) {
      const colInRow = rowFromBottom % 2 === 1 ? 9 - col : col;
      const tileNumber = rowFromBottom * 10 + colInRow + 1;
      ordered.push(
        byIndex.get(tileNumber) ?? { index: tileNumber, type: 'NORMAL' },
      );
    }
  }
  return ordered;
}

/**
 * Offset rapi (dalam persen papan) bila 2-5 pion berada di petak yang sama.
 */
export function getPawnClusterOffset(
  slotIndex: number,
  totalInTile: number,
): { dxPct: number; dyPct: number } {
  if (totalInTile <= 1) return { dxPct: 0, dyPct: 0 };

  if (totalInTile === 2) {
    return slotIndex === 0
      ? { dxPct: -1.8, dyPct: 0.6 }
      : { dxPct: 1.8, dyPct: -0.6 };
  }

  if (totalInTile === 3) {
    const positions = [
      { dxPct: 0, dyPct: -1.9 },
      { dxPct: -2.0, dyPct: 1.6 },
      { dxPct: 2.0, dyPct: 1.6 },
    ];
    return positions[slotIndex % 3];
  }

  const positions = [
    { dxPct: -2.0, dyPct: -1.8 },
    { dxPct: 2.0, dyPct: -1.8 },
    { dxPct: -2.0, dyPct: 1.8 },
    { dxPct: 2.0, dyPct: 1.8 },
    { dxPct: 0, dyPct: 0 },
  ];
  return positions[slotIndex % 5];
}
