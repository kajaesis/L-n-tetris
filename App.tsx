import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Undo, RefreshCw, Star } from 'lucide-react';
import { COLS, ROWS, SHAPES, UNLOCK_ORDER, COLORS } from './constants';
import { Grid, ActivePiece, Point, TetrominoDef } from './types';
import { Unicorn } from './components/Unicorn';
import { Button } from './components/Button';

// Utility to create empty grid
const createEmptyGrid = (): Grid => Array.from({ length: ROWS }, () => Array(COLS).fill(null));

// Utility to rotate matrix
const rotateMatrix = (matrix: number[][]): number[][] => {
  const rows = matrix.length;
  const cols = matrix[0].length;
  const newMatrix: number[][] = Array.from({ length: cols }, () => Array(rows).fill(0));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      newMatrix[c][rows - 1 - r] = matrix[r][c];
    }
  }
  return newMatrix;
};

// Utility to shuffle array (Fisher-Yates)
const shuffleArray = <T,>(array: T[]): T[] => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

export default function App() {
  // --- State ---
  const [grid, setGrid] = useState<Grid>(createEmptyGrid());
  const [activePiece, setActivePiece] = useState<ActivePiece | null>(null);
  const [score, setScore] = useState(0);
  const [showUnicorn, setShowUnicorn] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [history, setHistory] = useState<Grid[]>([]);
  const [clearingRows, setClearingRows] = useState<number[]>([]); // Indices of rows being cleared
  const [shakePiece, setShakePiece] = useState(false); // Visual feedback for invalid action
  const [shakeBoard, setShakeBoard] = useState(false); // Visual feedback for board errors (spawn block)
  
  // Ref for logic to avoid closure staleness during rapid events
  const activePieceRef = useRef<ActivePiece | null>(null);
  
  // Ref for board element to calculate drag coordinates
  const boardRef = useRef<HTMLDivElement>(null);
  const lastTapTime = useRef<number>(0);
  const dragStartPos = useRef<Point>({ r: 0, c: 0 });
  const isDragging = useRef(false);
  const dragOffset = useRef({ r: 0, c: 0 });

  // --- RNG State ---
  // Tracks the number of shapes we have handled unlocking so far. Starts at 2 (O and I).
  const maxUnlockedCountRef = useRef<number>(2); 
  // Bag for randomization to ensure fair distribution
  const bagRef = useRef<string[]>([]);

  // --- Logic ---

  // Check if a piece position is valid
  const isValidPosition = (shape: number[][], pos: Point, currentGrid: Grid): boolean => {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          const newR = pos.r + r;
          const newC = pos.c + c;
          
          // Check bounds
          if (newR < 0 || newR >= ROWS || newC < 0 || newC >= COLS) return false;
          
          // Check collision with filled cells
          // Note: When moving activePiece, the grid should NOT contain the piece itself
          if (currentGrid[newR][newC] !== null) return false;
        }
      }
    }
    return true;
  };

  // Trigger board shake animation
  const triggerBoardShake = () => {
    setShakeBoard(true);
    setTimeout(() => setShakeBoard(false), 300);
  };

  // Spawn a new piece DIRECTLY into the grid
  const spawnPiece = () => {
    if (clearingRows.length > 0) return;

    // Progression logic: Start with 2 shapes (O, I), add 1 shape every 4 points
    const currentUnlockedCount = 2 + Math.floor(score / 4);
    // Ensure we don't exceed the total number of shapes available
    const safeUnlockedCount = Math.min(currentUnlockedCount, UNLOCK_ORDER.length);
    
    let nextShapeKey: string;

    // 1. Check if we just unlocked a NEW shape level
    if (safeUnlockedCount > maxUnlockedCountRef.current) {
        // Force the newest shape to appear immediately!
        // The new shape is at index (safeUnlockedCount - 1)
        nextShapeKey = UNLOCK_ORDER[safeUnlockedCount - 1];
        
        // Update our tracker
        maxUnlockedCountRef.current = safeUnlockedCount;
        
        // Clear the bag so the new shape gets mixed in properly for subsequent turns
        bagRef.current = [];
    } else {
        // 2. Standard Bag Randomizer
        if (bagRef.current.length === 0) {
            // Refill bag with all currently available shapes
            const availableKeys = UNLOCK_ORDER.slice(0, safeUnlockedCount);
            // Create a bag with 1 of each available shape (or multiple for larger distribution)
            bagRef.current = shuffleArray([...availableKeys]);
        }
        
        // Pull from bag
        nextShapeKey = bagRef.current.pop()!;
    }

    const def = SHAPES[nextShapeKey];
    const startPos = { r: 0, c: Math.floor((COLS - def.shape[0].length) / 2) };
    
    // Check if spawn location is valid
    if (!isValidPosition(def.shape, startPos, grid)) {
      // Put the key back in the bag if we failed to spawn (optional, but polite)
      if (bagRef.current.indexOf(nextShapeKey) === -1) {
          bagRef.current.push(nextShapeKey);
      }
      
      // VISUAL FEEDBACK ONLY - DO NOT END GAME
      triggerBoardShake();
      return;
    }

    saveToHistory();

    const newGrid = grid.map(row => [...row]);
    const id = Math.random().toString(36).substr(2, 9);
    
    // Commit to grid immediately
    for (let r = 0; r < def.shape.length; r++) {
      for (let c = 0; c < def.shape[r].length; c++) {
        if (def.shape[r][c]) {
          newGrid[startPos.r + r][startPos.c + c] = {
            color: def.color,
            id: id
          };
        }
      }
    }
    setGrid(newGrid);
  };

  // Save history for undo
  const saveToHistory = () => {
    setHistory(prev => [...prev.slice(-10), JSON.parse(JSON.stringify(grid))]); // Keep last 10 steps
  };

  const handleUndo = () => {
    if (history.length === 0 || clearingRows.length > 0) return;
    const previousGrid = history[history.length - 1];
    setGrid(previousGrid);
    setHistory(prev => prev.slice(0, -1));
    setActivePiece(null);
    activePieceRef.current = null;
    isDragging.current = false;
  };

  // Trigger shake animation for piece
  const triggerShake = () => {
    setShakePiece(true);
    setTimeout(() => setShakePiece(false), 300);
  };

  // --- Interaction Logic ---

  const getGridPosFromEvent = (e: React.TouchEvent | React.MouseEvent | TouchEvent | MouseEvent): Point | null => {
    if (!boardRef.current) return null;
    const rect = boardRef.current.getBoundingClientRect();
    
    // Handle both touch and mouse
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    if (clientX === undefined || clientY === undefined) return null;

    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    const cellWidth = rect.width / COLS;
    const cellHeight = rect.height / ROWS;

    const c = Math.floor(x / cellWidth);
    const r = Math.floor(y / cellHeight);

    return { r, c };
  };

  // Function to attempt rotation of a piece (either active or on grid)
  const performRotation = (targetPiece: ActivePiece, tempGrid: Grid): ActivePiece | null => {
    let newShape = rotateMatrix(targetPiece.shape);
    
    // Wall kicks: try basic positions if direct rotation fails
    const kicks = [
      { r: 0, c: 0 },
      { r: 0, c: -1 }, { r: 0, c: 1 }, // Shift horizontal
      { r: -1, c: 0 }, { r: 1, c: 0 }, // Shift vertical
      { r: 0, c: -2 }, { r: 0, c: 2 }, // Shift more
      { r: -2, c: 0 } // Shift up more
    ];

    for (const kick of kicks) {
      const testPos = { r: targetPiece.position.r + kick.r, c: targetPiece.position.c + kick.c };
      if (isValidPosition(newShape, testPos, tempGrid)) {
        return {
          ...targetPiece,
          shape: newShape,
          position: testPos
        };
      }
    }
    return null; // Rotation failed
  };

  const handleDoubleTap = (pos: Point) => {
    // We only handle rotation for pieces on the grid
    if (grid[pos.r] && grid[pos.r][pos.c]) {
      const cell = grid[pos.r][pos.c];
      if (!cell || !cell.id) return;

      // Extract the piece from the grid to simulate "lifting" for rotation check
      const blocks: Point[] = [];
      let minR = ROWS, maxR = 0, minC = COLS, maxC = 0;
      const tempGrid = grid.map(row => [...row]);

      for(let r=0; r<ROWS; r++){
        for(let c=0; c<COLS; c++){
           if(grid[r][c]?.id === cell.id) {
             blocks.push({r, c});
             tempGrid[r][c] = null; // Remove from temp grid
             if(r < minR) minR = r;
             if(r > maxR) maxR = r;
             if(c < minC) minC = c;
             if(c > maxC) maxC = c;
           }
        }
      }

      const h = maxR - minR + 1;
      const w = maxC - minC + 1;
      const shape = Array.from({length: h}, () => Array(w).fill(0));
      blocks.forEach(b => {
          shape[b.r - minR][b.c - minC] = 1;
      });

      const pieceToRotate: ActivePiece = {
          type: 'placed',
          color: cell.color,
          id: cell.id,
          shape: shape,
          position: { r: minR, c: minC }
      };

      const rotated = performRotation(pieceToRotate, tempGrid);

      if (rotated) {
          saveToHistory();
          // Apply rotation to main grid
          const newGrid = tempGrid; // tempGrid already has the old piece removed
          for (let r = 0; r < rotated.shape.length; r++) {
              for (let c = 0; c < rotated.shape[r].length; c++) {
                  if (rotated.shape[r][c]) {
                      newGrid[rotated.position.r + r][rotated.position.c + c] = {
                          color: rotated.color,
                          id: rotated.id
                      };
                  }
              }
          }
          setGrid(newGrid);
          checkLines(newGrid);
      } else {
          triggerShake();
      }
    }
  };

  const handleStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (gameOver || clearingRows.length > 0) return;
    
    const pos = getGridPosFromEvent(e);
    if (!pos) return;

    // --- Double Tap Detection ---
    const now = Date.now();
    if (now - lastTapTime.current < 400) {
        handleDoubleTap(pos);
        isDragging.current = false; 
        
        // Revert any drag that might have been initialized by this tap
        if (activePieceRef.current) {
             const ap = activePieceRef.current;
             const startR = dragStartPos.current.r;
             const startC = dragStartPos.current.c;
             const newGrid = grid.map(row => [...row]);
              for (let r = 0; r < ap.shape.length; r++) {
                for (let c = 0; c < ap.shape[r].length; c++) {
                    if (ap.shape[r][c]) {
                         newGrid[startR + r][startC + c] = {
                             color: ap.color,
                             id: ap.id
                         };
                    }
                }
             }
             setGrid(newGrid);
             setActivePiece(null);
             activePieceRef.current = null;
        }
        return;
    }
    lastTapTime.current = now;
    // ----------------------------

    // Lift Logic (Picking up from grid)
    if (grid[pos.r] && grid[pos.r][pos.c]) {
      const cell = grid[pos.r][pos.c];
      if (cell && cell.id) {
        saveToHistory();
        
        // Find all blocks with this ID
        const blocks: Point[] = [];
        let minR = ROWS, maxR = 0, minC = COLS, maxC = 0;
        
        for(let r=0; r<ROWS; r++){
          for(let c=0; c<COLS; c++){
             if(grid[r][c]?.id === cell.id) {
               blocks.push({r, c});
               if(r < minR) minR = r;
               if(r > maxR) maxR = r;
               if(c < minC) minC = c;
               if(c > maxC) maxC = c;
             }
          }
        }
        
        if (blocks.length > 0) {
            const h = maxR - minR + 1;
            const w = maxC - minC + 1;
            const newShape = Array.from({length: h}, () => Array(w).fill(0));
            
            const newGrid = grid.map(row => [...row]);
            blocks.forEach(b => {
                newShape[b.r - minR][b.c - minC] = 1;
                newGrid[b.r][b.c] = null; // Clear from grid immediately
            });
            
            setGrid(newGrid);
            
            const liftStartPos = { r: minR, c: minC };
            const newActivePiece = {
                type: 'lifted',
                color: cell.color,
                id: cell.id,
                shape: newShape,
                position: liftStartPos
            };

            // Set both Ref (for immediate logic) and State (for render)
            activePieceRef.current = newActivePiece;
            setActivePiece(newActivePiece);

            isDragging.current = true;
            dragOffset.current = { r: pos.r - minR, c: pos.c - minC };
            dragStartPos.current = liftStartPos;
        }
      }
    }
  };

  const handleMove = (e: React.TouchEvent | React.MouseEvent) => {
    // Check Ref instead of State to avoid stale closure issues during rapid touch moves
    if (!isDragging.current || !activePieceRef.current) return;
    
    const pos = getGridPosFromEvent(e);
    if (!pos) return;

    const newR = pos.r - dragOffset.current.r;
    const newC = pos.c - dragOffset.current.c;
    
    // Update Ref
    activePieceRef.current = { ...activePieceRef.current, position: { r: newR, c: newC } };
    
    // Update State (triggers render)
    setActivePiece(prev => prev ? ({ ...prev, position: { r: newR, c: newC } }) : null);
  };

  const handleEnd = () => {
    // Check Ref for robust termination
    if (!isDragging.current || !activePieceRef.current) {
        isDragging.current = false;
        return;
    }
    isDragging.current = false;

    const currentPiece = activePieceRef.current;

    // Snap to integer
    const finalR = Math.round(currentPiece.position.r);
    const finalC = Math.round(currentPiece.position.c);
    
    let targetR = finalR;
    let targetC = finalC;

    // Strict Collision Check
    const valid = isValidPosition(currentPiece.shape, { r: finalR, c: finalC }, grid);
    
    if (!valid) {
        // INVALID placement - SNAP BACK TO START
        targetR = dragStartPos.current.r;
        targetC = dragStartPos.current.c;
        triggerShake();
    } 

    // ALWAYS COMMIT TO GRID
    const newGrid = grid.map(row => [...row]);
    for (let r = 0; r < currentPiece.shape.length; r++) {
        for (let c = 0; c < currentPiece.shape[r].length; c++) {
            if (currentPiece.shape[r][c]) {
                newGrid[targetR + r][targetC + c] = {
                    color: currentPiece.color,
                    id: currentPiece.id
                };
            }
        }
    }
    
    setGrid(newGrid);
    
    // Clear both Ref and State
    activePieceRef.current = null;
    setActivePiece(null);
    
    checkLines(newGrid);
  };

  // Check Lines with Animation
  const checkLines = (currentGrid: Grid) => {
    const rowsToClear: number[] = [];
    
    // Identify full rows
    for (let r = 0; r < ROWS; r++) {
        if (currentGrid[r].every(cell => cell !== null)) {
            rowsToClear.push(r);
        }
    }

    if (rowsToClear.length === 0) {
        return;
    }

    // Start Animation Phase
    setClearingRows(rowsToClear);

    // After animation, remove lines and update score
    setTimeout(() => {
        let newGrid = currentGrid.map(row => [...row]);
        newGrid = newGrid.filter((_, index) => !rowsToClear.includes(index));
        
        // Add new empty rows at the top
        while (newGrid.length < ROWS) {
            newGrid.unshift(Array(COLS).fill(null));
        }

        setGrid(newGrid);
        setScore(prev => prev + rowsToClear.length);
        setShowUnicorn(true);
        setClearingRows([]); // Reset animation state
    }, 500); 
  };

  const resetGame = () => {
      setGrid(createEmptyGrid());
      setScore(0);
      setGameOver(false);
      setActivePiece(null);
      activePieceRef.current = null;
      setHistory([]);
      setClearingRows([]);
      maxUnlockedCountRef.current = 2; // Reset progression
      bagRef.current = []; // Reset RNG
  };

  // --- Rendering ---
  
  return (
    <div className="flex flex-col h-full bg-slate-900 text-white font-sans select-none overflow-hidden">
      <Unicorn show={showUnicorn} onAnimationEnd={() => setShowUnicorn(false)} />

      {/* Header */}
      <div className="flex justify-between items-center p-4 bg-slate-800 shadow-md z-10 shrink-0">
        <div className="flex items-center gap-2">
           <Star className="text-yellow-400 fill-yellow-400 w-8 h-8" />
           <span className="text-4xl font-bold text-yellow-400">{score}</span>
        </div>
        <Button onClick={handleUndo} variant="secondary" disabled={history.length === 0} icon={<Undo size={24}/>} className="px-4 py-2">
           Zpět
        </Button>
      </div>

      {/* Main Game Area */}
      <div className="flex-1 min-h-0 relative flex justify-center items-center p-6 overflow-hidden">
          
          {/* Grid Container */}
          <div 
             ref={boardRef}
             className={`relative bg-slate-800 rounded-lg shadow-2xl border-4 border-slate-700 touch-none ${shakeBoard ? 'animate-shake' : ''}`}
             style={{
                 height: `min(calc(100dvh - 300px), 85vw * ${ROWS/COLS})`,
                 aspectRatio: `${COLS}/${ROWS}`,
             }}
             onTouchStart={handleStart}
             onTouchMove={handleMove}
             onTouchEnd={handleEnd}
             onMouseDown={handleStart}
             onMouseMove={handleMove}
             onMouseUp={handleEnd}
             onMouseLeave={handleEnd}
          >
             {/* Grid Background */}
             <div className="absolute inset-0 pointer-events-none" style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${COLS}, 1fr)`,
                gridTemplateRows: `repeat(${ROWS}, 1fr)`
             }}>
                {Array.from({ length: ROWS * COLS }).map((_, i) => (
                    <div key={i} className="border border-white/5 w-full h-full" />
                ))}
             </div>

             {/* Clearing Row Highlights (Underlay) */}
             {clearingRows.map(rowIndex => (
                <div 
                    key={`clear-${rowIndex}`}
                    className="absolute left-0 w-full bg-white animate-clear"
                    style={{
                        top: `${(rowIndex / ROWS) * 100}%`,
                        height: `${100 / ROWS}%`,
                    }}
                />
             ))}

             {/* Placed Blocks */}
             {grid.map((row, r) => (
                 row.map((cell, c) => {
                     if (!cell) return null;
                     const isClearing = clearingRows.includes(r);
                     return (
                         <div
                             key={`${r}-${c}`}
                             className={`absolute border-2 border-black/20 rounded-sm shadow-inner transition-opacity duration-300 ${isClearing ? 'opacity-0' : 'pop-in'}`}
                             style={{
                                 backgroundColor: cell.color,
                                 width: `${100/COLS}%`,
                                 height: `${100/ROWS}%`,
                                 left: `${(c / COLS) * 100}%`,
                                 top: `${(r / ROWS) * 100}%`,
                             }}
                         />
                     );
                 })
             ))}

             {/* Active Piece */}
             {activePiece && (
                 <div
                    className={`absolute transition-transform duration-75 ease-out pointer-events-none z-20 ${shakePiece ? 'animate-shake' : ''}`}
                    style={{
                        left: `${(activePiece.position.c / COLS) * 100}%`,
                        top: `${(activePiece.position.r / ROWS) * 100}%`,
                        width: `${(activePiece.shape[0].length / COLS) * 100}%`,
                        height: `${(activePiece.shape.length / ROWS) * 100}%`,
                    }}
                 >
                     {activePiece.shape.map((row, r) => (
                         row.map((val, c) => {
                             if (!val) return null;
                             const widthPct = 100 / activePiece.shape[0].length;
                             const heightPct = 100 / activePiece.shape.length;
                             return (
                                 <div
                                     key={`active-${r}-${c}`}
                                     className="absolute border-2 border-white/50 rounded-sm shadow-xl"
                                     style={{
                                         backgroundColor: activePiece.color,
                                         width: `${widthPct}%`,
                                         height: `${heightPct}%`,
                                         left: `${c * widthPct}%`,
                                         top: `${r * heightPct}%`,
                                     }}
                                 />
                             )
                         })
                     ))}
                 </div>
             )}
          </div>
      </div>

      {/* Controls */}
      <div className="bg-slate-800 p-4 pb-8 flex flex-col gap-4 shadow-[0_-5px_15px_rgba(0,0,0,0.3)] z-10 shrink-0">
          
          <div className="flex justify-center items-center w-full max-w-md mx-auto gap-4">
              <Button 
                 onClick={spawnPiece}
                 variant="success"
                 disabled={!!activePiece || clearingRows.length > 0} 
                 className={`w-full max-w-xs h-20 text-2xl tracking-wider transition-all shadow-xl ${!!activePiece ? 'opacity-50 grayscale' : 'animate-pulse'}`}
              >
                  {activePiece ? 'Polož dílek' : 'DÁT DÍLEK'}
              </Button>
          </div>
          
          <div className="text-center text-slate-400 text-sm">
             2x ťukni na dílek pro otočení. Nové tvary za každé 4 body!
          </div>
      </div>

      {/* Game Over Modal */}
      {gameOver && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-slate-800 p-8 rounded-3xl border-4 border-slate-600 shadow-2xl text-center max-w-sm w-full animate-bounce-in">
                  <h2 className="text-4xl font-bold text-white mb-2">Konec hry!</h2>
                  <p className="text-xl text-slate-300 mb-6">Nasbíral jsi {score} hvězdiček!</p>
                  
                  <div className="flex justify-center gap-2 mb-8">
                     {Array.from({length: Math.min(score, 5)}).map((_, i) => (
                         <Star key={i} className="text-yellow-400 fill-yellow-400 w-8 h-8 animate-spin" />
                     ))}
                  </div>

                  <Button onClick={resetGame} variant="success" className="w-full py-4 text-xl">
                      <RefreshCw className="mr-2" /> Nová hra
                  </Button>
              </div>
          </div>
      )}
    </div>
  );
}