import { TetrominoDef } from './types';

export const COLS = 10;
export const ROWS = 14;

// Pastel / Kid-friendly colors
export const COLORS = {
  I: '#22d3ee', // Cyan 400
  O: '#facc15', // Yellow 400
  T: '#a855f7', // Purple 500
  L: '#f97316', // Orange 500
  J: '#3b82f6', // Blue 500
  S: '#4ade80', // Green 400
  Z: '#f43f5e', // Rose 500
  GHOST: 'rgba(255, 255, 255, 0.2)',
};

export const SHAPES: Record<string, TetrominoDef> = {
  O: {
    type: 'O',
    shape: [
      [1, 1],
      [1, 1],
    ],
    color: COLORS.O,
  },
  I: {
    type: 'I',
    shape: [
      [1],
      [1],
      [1],
      [1],
    ],
    color: COLORS.I,
  },
  L: {
    type: 'L',
    shape: [
      [1, 0],
      [1, 0],
      [1, 1],
    ],
    color: COLORS.L,
  },
  J: {
    type: 'J',
    shape: [
      [0, 1],
      [0, 1],
      [1, 1],
    ],
    color: COLORS.J,
  },
  T: {
    type: 'T',
    shape: [
      [1, 1, 1],
      [0, 1, 0],
    ],
    color: COLORS.T,
  },
  S: {
    type: 'S',
    shape: [
      [0, 1, 1],
      [1, 1, 0],
    ],
    color: COLORS.S,
  },
  Z: {
    type: 'Z',
    shape: [
      [1, 1, 0],
      [0, 1, 1],
    ],
    color: COLORS.Z,
  }
};

// Order in which shapes are unlocked
export const UNLOCK_ORDER = ['O', 'I', 'L', 'J', 'T', 'S', 'Z'];
