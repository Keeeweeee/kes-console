// Minesweeper Game Logic - Classic minesweeper mechanics

export interface Position {
  row: number;
  col: number;
}

export enum TileState {
  HIDDEN = 'hidden',
  REVEALED = 'revealed',
  FLAGGED = 'flagged'
}

export enum GameState {
  READY = 'ready',
  PLAYING = 'playing',
  WON = 'won',
  LOST = 'lost'
}

export interface Tile {
  isMine: boolean;
  neighborMines: number;
  state: TileState;
  position: Position;
}

export interface MinesweeperGameData {
  board: Tile[][];
  gameState: GameState;
  mineCount: number;
  flagCount: number;
  revealedCount: number;
  totalTiles: number;
  startTime: Date | null;
  endTime: Date | null;
  firstClick: boolean;
}

export class MinesweeperGame {
  private data: MinesweeperGameData;
  private readonly rows: number;
  private readonly cols: number;
  private readonly mines: number;

  constructor(rows: number = 9, cols: number = 9, mines: number = 10) {
    this.rows = rows;
    this.cols = cols;
    this.mines = mines;
    this.data = this.initializeGame();
  }

  private initializeGame(): MinesweeperGameData {
    const board: Tile[][] = [];
    
    // Create empty board
    for (let row = 0; row < this.rows; row++) {
      board[row] = [];
      for (let col = 0; col < this.cols; col++) {
        board[row][col] = {
          isMine: false,
          neighborMines: 0,
          state: TileState.HIDDEN,
          position: { row, col }
        };
      }
    }

    return {
      board,
      gameState: GameState.READY,
      mineCount: this.mines,
      flagCount: 0,
      revealedCount: 0,
      totalTiles: this.rows * this.cols,
      startTime: null,
      endTime: null,
      firstClick: true
    };
  }

  private placeMines(excludePosition: Position): void {
    const positions: Position[] = [];
    
    // Generate all possible positions except the first click
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        if (row !== excludePosition.row || col !== excludePosition.col) {
          positions.push({ row, col });
        }
      }
    }

    // Ensure we don't try to place more mines than available positions
    const maxMines = Math.min(this.mines, positions.length);

    // Randomly place mines
    for (let i = 0; i < maxMines; i++) {
      if (positions.length === 0) break;
      
      const randomIndex = Math.floor(Math.random() * positions.length);
      const position = positions.splice(randomIndex, 1)[0];
      this.data.board[position.row][position.col].isMine = true;
    }

    // Calculate neighbor mine counts after all mines are placed
    this.calculateNeighborCounts();
  }

  private calculateNeighborCounts(): void {
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        if (!this.data.board[row][col].isMine) {
          this.data.board[row][col].neighborMines = this.countNeighborMines(row, col);
        }
      }
    }
  }

  private countNeighborMines(row: number, col: number): number {
    let count = 0;
    for (let r = row - 1; r <= row + 1; r++) {
      for (let c = col - 1; c <= col + 1; c++) {
        if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
          if (this.data.board[r][c].isMine) {
            count++;
          }
        }
      }
    }
    return count;
  }

  private getNeighbors(row: number, col: number): Position[] {
    const neighbors: Position[] = [];
    
    // Check all 8 surrounding positions
    for (let r = row - 1; r <= row + 1; r++) {
      for (let c = col - 1; c <= col + 1; c++) {
        // Skip if out of bounds or if it's the center tile itself
        if (r >= 0 && r < this.rows && c >= 0 && c < this.cols && !(r === row && c === col)) {
          neighbors.push({ row: r, col: c });
        }
      }
    }
    return neighbors;
  }

  private revealTile(row: number, col: number): void {
    // Bounds check
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return;
    
    const tile = this.data.board[row][col];
    
    // Only reveal hidden tiles
    if (tile.state !== TileState.HIDDEN) return;

    // Reveal the tile
    tile.state = TileState.REVEALED;
    this.data.revealedCount++;

    // If it's an empty tile (no neighboring mines), recursively reveal neighbors
    if (tile.neighborMines === 0 && !tile.isMine) {
      const neighbors = this.getNeighbors(row, col);
      neighbors.forEach(pos => {
        this.revealTile(pos.row, pos.col);
      });
    }
  }

  // Public API
  clickTile(row: number, col: number): boolean {
    // Bounds check
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
      return false;
    }

    if (this.data.gameState === GameState.WON || this.data.gameState === GameState.LOST) {
      return false;
    }

    const tile = this.data.board[row][col];
    if (tile.state !== TileState.HIDDEN) {
      return false;
    }

    // Handle first click - ensure first clicked tile is never a mine
    if (this.data.firstClick) {
      this.placeMines({ row, col });
      this.data.gameState = GameState.PLAYING;
      this.data.startTime = new Date();
      this.data.firstClick = false;
      
      // After placing mines, the first clicked tile should never be a mine
      // This is guaranteed by placeMines excluding the first click position
    }

    // Reveal the tile and potentially cascade
    this.revealTile(row, col);

    // Check for mine (should never happen on first click)
    if (tile.isMine) {
      this.data.gameState = GameState.LOST;
      this.data.endTime = new Date();
      // Reveal all mines
      this.revealAllMines();
      return false;
    }

    // Check for win condition
    if (this.data.revealedCount === this.data.totalTiles - this.mines) {
      this.data.gameState = GameState.WON;
      this.data.endTime = new Date();
    }

    return true;
  }

  flagTile(row: number, col: number): void {
    // Bounds check
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
      return;
    }

    if (this.data.gameState === GameState.WON || this.data.gameState === GameState.LOST) {
      return;
    }

    const tile = this.data.board[row][col];
    
    // Toggle flag state only for hidden and flagged tiles
    if (tile.state === TileState.HIDDEN) {
      tile.state = TileState.FLAGGED;
      this.data.flagCount++;
    } else if (tile.state === TileState.FLAGGED) {
      tile.state = TileState.HIDDEN;
      this.data.flagCount--;
    }
    // Revealed tiles cannot be flagged
  }

  private revealAllMines(): void {
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const tile = this.data.board[row][col];
        if (tile.isMine && tile.state !== TileState.FLAGGED) {
          tile.state = TileState.REVEALED;
        }
      }
    }
  }

  reset(): void {
    this.data = this.initializeGame();
  }

  // Getters for game state
  getGameData(): Readonly<MinesweeperGameData> {
    return { ...this.data, board: this.data.board.map(row => [...row]) };
  }

  getRemainingMines(): number {
    return this.mines - this.data.flagCount;
  }

  getGameDuration(): number {
    if (!this.data.startTime) return 0;
    const endTime = this.data.endTime || new Date();
    return endTime.getTime() - this.data.startTime.getTime();
  }

  // AI Analysis Methods
  calculateTileProbability(row: number, col: number): number {
    const tile = this.data.board[row][col];
    
    if (tile.state !== TileState.HIDDEN) {
      return tile.isMine ? 1.0 : 0.0;
    }

    // Simple probability calculation based on revealed neighbors
    const neighbors = this.getNeighbors(row, col);
    const revealedNeighbors = neighbors.filter(pos => 
      this.data.board[pos.row][pos.col].state === TileState.REVEALED
    );

    if (revealedNeighbors.length === 0) {
      // No information available, use global probability
      const remainingTiles = this.data.totalTiles - this.data.revealedCount - this.data.flagCount;
      const remainingMines = this.mines - this.data.flagCount;
      return remainingMines / remainingTiles;
    }

    // Calculate based on neighbor mine counts
    let totalConstraints = 0;
    let satisfiedConstraints = 0;

    revealedNeighbors.forEach(pos => {
      const neighborTile = this.data.board[pos.row][pos.col];
      if (neighborTile.neighborMines > 0) {
        totalConstraints++;
        
        const neighborNeighbors = this.getNeighbors(pos.row, pos.col);
        const flaggedCount = neighborNeighbors.filter(nPos => 
          this.data.board[nPos.row][nPos.col].state === TileState.FLAGGED
        ).length;
        
        const hiddenCount = neighborNeighbors.filter(nPos => 
          this.data.board[nPos.row][nPos.col].state === TileState.HIDDEN
        ).length;

        if (hiddenCount > 0) {
          const remainingMines = neighborTile.neighborMines - flaggedCount;
          if (remainingMines > 0) {
            satisfiedConstraints += remainingMines / hiddenCount;
          }
        }
      }
    });

    if (totalConstraints === 0) {
      const remainingTiles = this.data.totalTiles - this.data.revealedCount - this.data.flagCount;
      const remainingMines = this.mines - this.data.flagCount;
      return remainingMines / remainingTiles;
    }

    return Math.min(1.0, satisfiedConstraints / totalConstraints);
  }

  getHiddenTiles(): Position[] {
    const hiddenTiles: Position[] = [];
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        if (this.data.board[row][col].state === TileState.HIDDEN) {
          hiddenTiles.push({ row, col });
        }
      }
    }
    return hiddenTiles;
  }
}