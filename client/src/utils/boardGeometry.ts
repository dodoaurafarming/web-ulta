import type { BoardCell } from '../types/protocol';

export interface PlayerPalette {
  name: string;
  bg: string;
  border: string;
  text: string;
  tintBg: string;
  hex: string;
}

/**
 * 5 warna pion bergaya token kayu board-game modern dengan kontras tinggi
 * di atas permukaan papan hangat #FAF6EE.
 */
export const PLAYER_PALETTES: PlayerPalette[] = [
  {
    name: 'Vermilion',
    bg: 'bg-[#D6453A]',
    border: 'border-[#9B2C24]',
    text: 'text-[#9B2C24]',
    tintBg: 'bg-[#FDECEB]',
    hex: '#D6453A',
  },
  {
    name: 'Cobalt',
    bg: 'bg-[#2B6CB0]',
    border: 'border-[#1E4B7A]',
    text: 'text-[#1E4B7A]',
    tintBg: 'bg-[#EAF2FB]',
    hex: '#2B6CB0',
  },
  {
    name: 'Forest',
    bg: 'bg-[#2F855A]',
    border: 'border-[#1F5C3D]',
    text: 'text-[#1F5C3D]',
    tintBg: 'bg-[#E6F4EC]',
    hex: '#2F855A',
  },
  {
    name: 'Plum',
    bg: 'bg-[#7B4B94]',
    border: 'border-[#543166]',
    text: 'text-[#543166]',
    tintBg: 'bg-[#F3ECF7]',
    hex: '#7B4B94',
  },
  {
    name: 'Ochre',
    bg: 'bg-[#C9821E]',
    border: 'border-[#8C5810]',
    text: 'text-[#8C5810]',
    tintBg: 'bg-[#FCF3E3]',
    hex: '#C9821E',
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
 * Titik jangkar SVG (1000x1000) sedikit bergeser ke bawah-kanan dari pojok kiri-atas
 * agar angka nomor petak di sudut kiri-atas tidak pernah tertutup ujung ular/tangga.
 */
export function getTileCenterSvg(tileNumber: number): { x: number; y: number } {
  const { visualRow, col } = getTileCoords(tileNumber);
  return {
    x: col * 100 + 54,
    y: visualRow * 100 + 58,
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
    topPct: visualRow * 10 + 5.6,
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
      ? { dxPct: -1.7, dyPct: 0.6 }
      : { dxPct: 1.7, dyPct: -0.6 };
  }

  if (totalInTile === 3) {
    const positions = [
      { dxPct: 0, dyPct: -1.8 },
      { dxPct: -1.9, dyPct: 1.5 },
      { dxPct: 1.9, dyPct: 1.5 },
    ];
    return positions[slotIndex % 3];
  }

  const positions = [
    { dxPct: -1.9, dyPct: -1.7 },
    { dxPct: 1.9, dyPct: -1.7 },
    { dxPct: -1.9, dyPct: 1.7 },
    { dxPct: 1.9, dyPct: 1.7 },
    { dxPct: 0, dyPct: 0 },
  ];
  return positions[slotIndex % 5];
}
