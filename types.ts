export type BlockColor = string;

// A single coordinate point
export interface Point {
  r: number; // row
  c: number; // column
}

// Definition of a shape type (e.g., 'I', 'O')
export interface TetrominoDef {
  type: string;
  shape: number[][]; // 2D array representing the mask (1s and 0s) or relative coords
  color: string;
}

// A piece instance in the game
export interface ActivePiece {
  type: string;
  shape: number[][]; // The current rotated shape mask
  color: string;
  position: Point; // Top-left coordinate on the grid
  id: string; // Unique ID to track lifting
}

// The grid is a 2D array of cells
export type GridCell = {
  color: string;
  id?: string; // ID of the piece it belongs to (optional, for advanced lifting logic)
} | null;

export type Grid = GridCell[][];

export interface GameState {
  grid: Grid;
  score: number;
  gameOver: boolean;
}