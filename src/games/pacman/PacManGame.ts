// Pac-Man Game Logic - Classic maze-based mechanics

export interface Position {
  x: number;
  y: number;
}

export interface SpeechBubble {
  ghostId: string;
  text: string;
  startTime: number;
  duration: number;
}

export interface MovementSegment {
  fromTile: Position;
  toTile: Position;
  startTime: number;
  duration: number;
}

export enum Direction {
  UP = 'up',
  DOWN = 'down',
  LEFT = 'left',
  RIGHT = 'right',
  NONE = 'none'
}

export enum CellType {
  WALL = '#',
  PELLET = '.',
  POWER_PELLET = 'o',
  EMPTY = ' ',
  GHOST_HOUSE = 'H'
}

export enum GameState {
  READY = 'ready',
  PLAYING = 'playing',
  DEATH_PAUSE = 'death_pause',
  WON = 'won',
  LOST = 'lost',
  PAUSED = 'paused'
}

export enum GhostState {
  NORMAL = 'normal',
  FRIGHTENED = 'frightened',
  EATEN = 'eaten',
  REVIVING = 'reviving'
}

export interface Ghost {
  id: string;
  position: Position;
  movementSegment: MovementSegment | null; // Immutable segment for interpolation
  direction: Direction;
  isVulnerable: boolean;
  isEaten: boolean;
  state: GhostState;
  reviveTime: number | null;
  homePosition: Position;
  personality: 'loner' | 'bully' | 'mimic' | 'strategist';
  color: string;
  lastSpeechTime: number; // Cooldown tracking
}

export interface PacManGameData {
  pacman: {
    position: Position;
    movementSegment: MovementSegment | null; // Immutable segment for interpolation
    direction: Direction;
    nextDirection: Direction;
  };
  ghosts: Ghost[];
  maze: CellType[][];
  gameState: GameState;
  score: number;
  lives: number;
  pelletsRemaining: number;
  powerPelletActive: boolean;
  powerPelletTimer: number;
  deathPauseTimer: number;
  startTime: Date | null;
  endTime: Date | null;
  level: number;
  speechBubbles: SpeechBubble[];
  lastKillerGhost: string | null; // Track which ghost killed Pac-Man
}

export class PacManGame {
  private data: PacManGameData;
  private gameLoop: number | null = null;
  private readonly LOGIC_UPDATE_RATE = 200; // milliseconds between logic updates (tile movement)
  private readonly POWER_PELLET_DURATION = 10000; // 10 seconds
  private readonly GHOST_REVIVAL_TIME = 4000; // 4 seconds to revive
  private readonly DEATH_PAUSE_DURATION = 1500; // 1.5 seconds freeze on death
  private readonly SPEECH_BUBBLE_DURATION = 1500; // 1.5 seconds
  private readonly SPEECH_COOLDOWN = 2500; // 2.5 seconds between speeches
  private readonly maze: string[] = [
    "###################",
    "#........#........#",
    "#o##.###.#.###.##o#",
    "#.................#",
    "#.##.#.#####.#.##.#",
    "#....#...#...#....#",
    "####.### # ###.####",
    "   #.#       #.#   ",
    "####.# ## ## #.####",
    ".....  #   #  .....",
    "####.# ##### #.####",
    "   #.#       #.#   ",
    "####.# ##### #.####",
    "#........#........#",
    "#.##.###.#.###.##.#",
    "#o.#.....P.....#.o#",
    "##.#.#.#####.#.#.##",
    "#....#...#...#....#",
    "#.######.#.######.#",
    "#.................#",
    "###################"
  ];

  constructor() {
    this.data = this.initializeGame();
  }

  private initializeGame(): PacManGameData {
    const maze = this.parseMaze();
    const pacmanPos = this.findPacManStartPosition();
    const ghosts = this.initializeGhosts();

    return {
      pacman: {
        position: pacmanPos,
        movementSegment: null,
        direction: Direction.NONE,
        nextDirection: Direction.NONE
      },
      ghosts,
      maze,
      gameState: GameState.READY,
      score: 0,
      lives: 3,
      pelletsRemaining: this.countPellets(maze),
      powerPelletActive: false,
      powerPelletTimer: 0,
      deathPauseTimer: 0,
      startTime: null,
      endTime: null,
      level: 1,
      speechBubbles: [],
      lastKillerGhost: null
    };
  }

  private parseMaze(): CellType[][] {
    const maze: CellType[][] = [];
    for (let row = 0; row < this.maze.length; row++) {
      maze[row] = [];
      for (let col = 0; col < this.maze[row].length; col++) {
        const char = this.maze[row][col];
        switch (char) {
          case '#':
            maze[row][col] = CellType.WALL;
            break;
          case '.':
            maze[row][col] = CellType.PELLET;
            break;
          case 'o':
            maze[row][col] = CellType.POWER_PELLET;
            break;
          case 'P':
            maze[row][col] = CellType.EMPTY;
            break;
          case 'H':
            maze[row][col] = CellType.GHOST_HOUSE;
            break;
          default:
            maze[row][col] = CellType.EMPTY;
        }
      }
    }
    return maze;
  }

  private findPacManStartPosition(): Position {
    for (let row = 0; row < this.maze.length; row++) {
      for (let col = 0; col < this.maze[row].length; col++) {
        if (this.maze[row][col] === 'P') {
          return { x: col, y: row };
        }
      }
    }
    return { x: 10, y: 15 }; // Default position
  }

  private initializeGhosts(): Ghost[] {
    const ghostStartPositions = [
      { x: 8, y: 9 },   // Loner (Red)
      { x: 9, y: 9 },   // Bully (Pink) 
      { x: 10, y: 9 },  // Mimic (Cyan)
      { x: 9, y: 8 }   // Strategist (Orange)
    ];

    return [
      {
        id: 'loner',
        position: ghostStartPositions[0],
        movementSegment: null,
        direction: Direction.UP,
        isVulnerable: false,
        isEaten: false,
        state: GhostState.NORMAL,
        reviveTime: null,
        homePosition: ghostStartPositions[0],
        personality: 'loner',
        color: '#00aaffff',
        lastSpeechTime: 0
      },
      {
        id: 'bully',
        position: ghostStartPositions[1],
        movementSegment: null,
        direction: Direction.UP,
        isVulnerable: false,
        isEaten: false,
        state: GhostState.NORMAL,
        reviveTime: null,
        homePosition: ghostStartPositions[1],
        personality: 'bully',
        color: '#ff0000ff',
        lastSpeechTime: 0
      },
      {
        id: 'mimic',
        position: ghostStartPositions[2],
        movementSegment: null,
        direction: Direction.UP,
        isVulnerable: false,
        isEaten: false,
        state: GhostState.NORMAL,
        reviveTime: null,
        homePosition: ghostStartPositions[2],
        personality: 'mimic',
        color: '#efa1ffff',
        lastSpeechTime: 0
      },
      {
        id: 'strategist',
        position: ghostStartPositions[3],
        movementSegment: null,
        direction: Direction.UP,
        isVulnerable: false,
        isEaten: false,
        state: GhostState.NORMAL,
        reviveTime: null,
        homePosition: ghostStartPositions[3],
        personality: 'strategist',
        color: '#00bd5bff',
        lastSpeechTime: 0
      }
    ];
  }

  private countPellets(maze: CellType[][]): number {
    let count = 0;
    for (let row = 0; row < maze.length; row++) {
      for (let col = 0; col < maze[row].length; col++) {
        if (maze[row][col] === CellType.PELLET || maze[row][col] === CellType.POWER_PELLET) {
          count++;
        }
      }
    }
    return count;
  }

  // Public API
  start(): void {
    if (this.data.gameState === GameState.READY) {
      this.data.gameState = GameState.PLAYING;
      this.data.startTime = new Date();
      this.startGameLoop();
    }
  }

  pause(): void {
    if (this.data.gameState === GameState.PLAYING) {
      this.data.gameState = GameState.PAUSED;
      this.stopGameLoop();
    }
  }

  resume(): void {
    if (this.data.gameState === GameState.PAUSED) {
      this.data.gameState = GameState.PLAYING;
      this.startGameLoop();
    }
  }

  reset(): void {
    this.stopGameLoop();
    this.data = this.initializeGame();
  }

  setDirection(direction: Direction): void {
    // Only accept input during active gameplay
    if (this.data.gameState === GameState.PLAYING) {
      this.data.pacman.nextDirection = direction;
    }
    // Ignore input during death pause, ready, won, lost states
  }

  // Game state access
  getGameData(): Readonly<PacManGameData> {
    return { 
      ...this.data, 
      maze: this.data.maze.map(row => [...row]),
      ghosts: this.data.ghosts.map(ghost => ({ ...ghost }))
    };
  }

  getScore(): number {
    return this.data.score;
  }

  getLives(): number {
    return this.data.lives;
  }

  getGameDuration(): number {
    if (!this.data.startTime) return 0;
    const endTime = this.data.endTime || new Date();
    return endTime.getTime() - this.data.startTime.getTime();
  }

  // Private game logic
  private startGameLoop(): void {
    this.gameLoop = window.setInterval(() => {
      this.update();
    }, this.LOGIC_UPDATE_RATE);
  }

  private stopGameLoop(): void {
    if (this.gameLoop) {
      clearInterval(this.gameLoop);
      this.gameLoop = null;
    }
  }

  private completeMovementSegments(): void {
    const now = Date.now();
    
    // Complete Pac-Man segment
    const pac = this.data.pacman;
    if (pac.movementSegment && now >= pac.movementSegment.startTime + pac.movementSegment.duration) {
      console.log('[PAC-MAN] Segment completed');
      // Snap to final tile position
      pac.position = { ...pac.movementSegment.toTile };
      // Clear segment - entity is now idle
      pac.movementSegment = null;
    }
    
    // Complete ghost segments (but only for active ghosts)
    for (const ghost of this.data.ghosts) {
      // STRICT RESURRECTION CONTRACT: Skip eaten/reviving ghosts
      if (ghost.state === GhostState.EATEN || ghost.state === GhostState.REVIVING) {
        // These ghosts should not have segments anyway, but ensure they're null
        if (ghost.movementSegment !== null) {
          console.warn(`[${ghost.id.toUpperCase()}] Clearing unexpected segment for ${ghost.state} ghost`);
          ghost.movementSegment = null;
        }
        continue;
      }
      
      if (ghost.movementSegment && now >= ghost.movementSegment.startTime + ghost.movementSegment.duration) {
        console.log(`[${ghost.id.toUpperCase()}] Segment completed at tile (${ghost.movementSegment.toTile.x}, ${ghost.movementSegment.toTile.y})`);
        
        // Snap to final tile position
        ghost.position = { ...ghost.movementSegment.toTile };
        
        // CRITICAL: Clear segment to mark as idle
        // AI will immediately create next segment in updateGhosts()
        ghost.movementSegment = null;
      }
    }
  }

  private update(): void {
    // CRITICAL: Complete movement segments FIRST
    // This must happen before AI decisions, collisions, or state changes
    this.completeMovementSegments();

    // Update speech bubbles (remove expired ones)
    this.updateSpeechBubbles();

    // Handle death pause state
    if (this.data.gameState === GameState.DEATH_PAUSE) {
      this.data.deathPauseTimer -= this.LOGIC_UPDATE_RATE;
      if (this.data.deathPauseTimer <= 0) {
        // Resume game after pause
        this.data.gameState = GameState.PLAYING;
        this.resetPositions();
      }
      return; // Don't update anything during death pause
    }

    if (this.data.gameState !== GameState.PLAYING) return;

    // Update power pellet timer
    if (this.data.powerPelletActive) {
      this.data.powerPelletTimer -= this.LOGIC_UPDATE_RATE;
      if (this.data.powerPelletTimer <= 0) {
        this.data.powerPelletActive = false;
        this.data.ghosts.forEach(ghost => {
          if (ghost.state === GhostState.FRIGHTENED) {
            ghost.state = GhostState.NORMAL;
            ghost.isVulnerable = false;
          }
        });
      }
    }

    // Update ghost states and handle revival
    this.updateGhostStates();

    // Update Pac-Man (grid-based only)
    this.updatePacMan();

    // Update ghosts (AI will control their movement)
    this.updateGhosts();

    // Check collisions (only when entities are on same grid tile)
    this.checkCollisions();

    // Check win condition
    if (this.data.pelletsRemaining === 0) {
      this.data.gameState = GameState.WON;
      this.data.endTime = new Date();
      this.stopGameLoop();
    }
  }

  private updateGhostStates(): void {
    const now = Date.now();
    
    for (const ghost of this.data.ghosts) {
      // STRICT RESURRECTION CONTRACT: Handle ghost revival
      if (ghost.state === GhostState.EATEN && ghost.reviveTime && now >= ghost.reviveTime) {
        // EATEN → REVIVING transition
        console.log(`[${ghost.id.toUpperCase()}] EATEN → REVIVING`);
        ghost.state = GhostState.REVIVING;
        ghost.reviveTime = now + 1000; // 1 second reviving animation
        
        // Ensure ghost remains immobile during reviving
        ghost.movementSegment = null;
        ghost.direction = Direction.NONE;
        
      } else if (ghost.state === GhostState.REVIVING && ghost.reviveTime && now >= ghost.reviveTime) {
        // REVIVING → NORMAL transition
        console.log(`[${ghost.id.toUpperCase()}] REVIVING → NORMAL (resurrection complete)`);
        
        // 1) Reset all movement state
        ghost.movementSegment = null;
        ghost.direction = Direction.NONE;
        
        // 2) Complete revival
        ghost.state = GhostState.NORMAL;
        ghost.isEaten = false;
        ghost.isVulnerable = false;
        ghost.reviveTime = null;
        
        // 3) Check if power pellet is still active
        if (this.data.powerPelletActive) {
          console.log(`[${ghost.id.toUpperCase()}] Entering FRIGHTENED state (power pellet still active)`);
          ghost.state = GhostState.FRIGHTENED;
          ghost.isVulnerable = true;
        }
        
        // 4) Ghost will be forced to move by AI on next update (spawn-exit logic)
        console.log(`[${ghost.id.toUpperCase()}] Ready for first movement after revival`);
      }
      
      // Update frightened state based on power pellet (for already-active ghosts)
      if (this.data.powerPelletActive && ghost.state === GhostState.NORMAL) {
        ghost.state = GhostState.FRIGHTENED;
        ghost.isVulnerable = true;
      } else if (!this.data.powerPelletActive && ghost.state === GhostState.FRIGHTENED) {
        ghost.state = GhostState.NORMAL;
        ghost.isVulnerable = false;
      }
    }
  }

  private updatePacMan(): void {
    const pacman = this.data.pacman;
    
    // Try to change direction if requested
    if (pacman.nextDirection !== Direction.NONE) {
      const nextPos = this.getNextPosition(pacman.position, pacman.nextDirection);
      if (this.isValidMove(nextPos)) {
        pacman.direction = pacman.nextDirection;
        pacman.nextDirection = Direction.NONE;
      }
    }

    // Move Pac-Man one tile in current direction
    if (pacman.direction !== Direction.NONE) {
      const nextPos = this.getNextPosition(pacman.position, pacman.direction);
      if (this.isValidMove(nextPos)) {
        const fromTile = { ...pacman.position };
        const toTile = { ...nextPos };
        
        // Handle tunnel wrapping
        if (toTile.x < 0) {
          toTile.x = this.data.maze[0].length - 1;
        } else if (toTile.x >= this.data.maze[0].length) {
          toTile.x = 0;
        }
        
        // Create or chain movement segment
        pacman.movementSegment = this.createOrChainSegment(
          pacman.movementSegment,
          fromTile,
          toTile,
          pacman.direction
        );
        
        // Update grid position
        pacman.position = toTile;

        // Collect pellets
        this.collectPellet(pacman.position);
      } else {
        // Stop if hit wall
        pacman.direction = Direction.NONE;
      }
    }
  }

  private updateGhosts(): void {
    // CRITICAL: Ensure continuous segment ownership
    // Any idle ghost MUST receive a new segment immediately
    // This is called AFTER completeMovementSegments() in the same tick
    
    for (const ghost of this.data.ghosts) {
      // Skip eaten/reviving ghosts
      if (ghost.state === GhostState.EATEN || ghost.state === GhostState.REVIVING) {
        continue;
      }
      
      // If ghost is idle (no segment), it MUST get a direction immediately
      // This prevents any gap between segment completion and next segment
      if (ghost.movementSegment === null) {
        // Ghost needs a direction - this will be provided by AI via moveGhost()
        // The AI analyzer in PacMan.tsx must call moveGhost() for idle ghosts
        // No action here - just ensuring the contract is clear
      }
    }
  }

  // Lookahead chaining: extend segments before they complete
  // This is called by external AI system when it wants to chain movement
  tryChainGhostSegment(ghostId: string, nextDirection: Direction): boolean {
    const ghost = this.data.ghosts.find(g => g.id === ghostId);
    if (!ghost || !ghost.movementSegment) return false;

    // Check if segment is >= 75% complete
    const now = Date.now();
    const elapsed = now - ghost.movementSegment.startTime;
    const progress = elapsed / ghost.movementSegment.duration;
    
    if (progress < 0.75) {
      return false; // Too early to chain
    }

    // Get current segment direction
    const currentDirection = this.getDirectionBetweenTiles(
      ghost.movementSegment.fromTile,
      ghost.movementSegment.toTile
    );

    // Only chain if directions match (straight line)
    if (currentDirection !== nextDirection) {
      return false; // Direction change, will create new segment after completion
    }

    // Calculate next tile
    const currentToTile = ghost.movementSegment.toTile;
    const nextTile = this.getNextPosition(currentToTile, nextDirection);

    // Validate next tile
    if (!this.isValidMove(nextTile)) {
      return false; // Can't chain into wall
    }

    // Handle tunnel wrapping
    if (nextTile.x < 0) {
      nextTile.x = this.data.maze[0].length - 1;
    } else if (nextTile.x >= this.data.maze[0].length) {
      nextTile.x = 0;
    }

    // EXTEND the segment (don't replace it)
    ghost.movementSegment.toTile = nextTile;
    ghost.movementSegment.duration += this.LOGIC_UPDATE_RATE;

    console.log(`[${ghostId.toUpperCase()}] Segment chained: extending to (${nextTile.x},${nextTile.y}), new duration: ${ghost.movementSegment.duration}ms`);

    // Update ghost's grid position to the new target
    ghost.position = nextTile;

    return true;
  }

  private getNextPosition(pos: Position, direction: Direction): Position {
    switch (direction) {
      case Direction.UP:
        return { x: pos.x, y: pos.y - 1 };
      case Direction.DOWN:
        return { x: pos.x, y: pos.y + 1 };
      case Direction.LEFT:
        return { x: pos.x - 1, y: pos.y };
      case Direction.RIGHT:
        return { x: pos.x + 1, y: pos.y };
      default:
        return pos;
    }
  }

  private getDirectionBetweenTiles(from: Position, to: Position): Direction {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    
    if (dx > 0) return Direction.RIGHT;
    if (dx < 0) return Direction.LEFT;
    if (dy > 0) return Direction.DOWN;
    if (dy < 0) return Direction.UP;
    return Direction.NONE;
  }

  private shouldChainSegment(
    currentSegment: MovementSegment | null,
    newDirection: Direction
  ): boolean {
    if (!currentSegment) return false;
    
    // Get direction of current segment
    const segmentDirection = this.getDirectionBetweenTiles(
      currentSegment.fromTile,
      currentSegment.toTile
    );
    
    // Chain if directions match
    return segmentDirection === newDirection;
  }

  private createOrChainSegment(
    currentSegment: MovementSegment | null,
    fromTile: Position,
    toTile: Position,
    direction: Direction
  ): MovementSegment {
    // Check if we should chain
    if (this.shouldChainSegment(currentSegment, direction)) {
      // Chain: extend the segment without resetting startTime
      return {
        fromTile: currentSegment!.fromTile, // Keep original start
        toTile, // Update to new destination
        startTime: currentSegment!.startTime, // Keep original startTime
        duration: currentSegment!.duration + this.LOGIC_UPDATE_RATE // Extend duration
      };
    } else {
      // New direction: create fresh segment
      return {
        fromTile,
        toTile,
        startTime: Date.now(),
        duration: this.LOGIC_UPDATE_RATE
      };
    }
  }

  private isValidMove(pos: Position): boolean {
    if (pos.y < 0 || pos.y >= this.data.maze.length) return false;
    if (pos.x < 0 || pos.x >= this.data.maze[0].length) return true; // Allow tunnel
    return this.data.maze[pos.y][pos.x] !== CellType.WALL;
  }

  private collectPellet(pos: Position): void {
    const cell = this.data.maze[pos.y][pos.x];
    
    if (cell === CellType.PELLET) {
      this.data.maze[pos.y][pos.x] = CellType.EMPTY;
      this.data.score += 10;
      this.data.pelletsRemaining--;
    } else if (cell === CellType.POWER_PELLET) {
      this.data.maze[pos.y][pos.x] = CellType.EMPTY;
      this.data.score += 50;
      this.data.pelletsRemaining--;
      
      // Activate power pellet
      this.data.powerPelletActive = true;
      this.data.powerPelletTimer = this.POWER_PELLET_DURATION;
      this.data.ghosts.forEach(ghost => {
        if (ghost.state === GhostState.NORMAL) {
          ghost.state = GhostState.FRIGHTENED;
          ghost.isVulnerable = true;
        }
      });
    }
  }

  private checkCollisions(): void {
    const pacmanPos = this.data.pacman.position;
    
    for (const ghost of this.data.ghosts) {
      // Only check collision when both are on same grid tile
      if (ghost.position.x === pacmanPos.x && ghost.position.y === pacmanPos.y) {
        if (ghost.state === GhostState.FRIGHTENED) {
          // STRICT RESURRECTION CONTRACT: Eat ghost
          console.log(`[${ghost.id.toUpperCase()}] EATEN by Pac-Man`);
          
          // 1) Clear movement state immediately
          ghost.movementSegment = null;
          ghost.direction = Direction.NONE;
          
          // 2) Set eaten state
          ghost.state = GhostState.EATEN;
          ghost.isEaten = true;
          ghost.isVulnerable = false;
          ghost.reviveTime = Date.now() + this.GHOST_REVIVAL_TIME;
          
          // 3) Teleport to home position
          ghost.position = { ...ghost.homePosition };
          
          this.data.score += 200;
        } else if (ghost.state === GhostState.NORMAL) {
          // Pac-Man dies - enter death pause
          console.log(`[DEATH] Pac-Man killed by ${ghost.id.toUpperCase()}`);
          this.data.lastKillerGhost = ghost.id; // Track killer for AI commentary
          this.data.lives--;
          if (this.data.lives <= 0) {
            // Game over
            this.data.gameState = GameState.LOST;
            this.data.endTime = new Date();
            this.stopGameLoop();
          } else {
            // Enter death pause state
            this.data.gameState = GameState.DEATH_PAUSE;
            this.data.deathPauseTimer = this.DEATH_PAUSE_DURATION;
            // Positions will reset after pause ends
          }
        }
        // Eaten and reviving ghosts don't interact with Pac-Man
      }
    }
  }

  private resetPositions(): void {
    const startPos = this.findPacManStartPosition();
    this.data.pacman.position = startPos;
    this.data.pacman.movementSegment = null;
    this.data.pacman.direction = Direction.NONE;
    this.data.pacman.nextDirection = Direction.NONE;
    
    this.data.ghosts.forEach((ghost) => {
      ghost.position = { ...ghost.homePosition };
      ghost.movementSegment = null;
      ghost.direction = Direction.UP;
      ghost.isVulnerable = false;
      ghost.isEaten = false;
      ghost.state = GhostState.NORMAL;
      ghost.reviveTime = null;
    });
    
    this.data.powerPelletActive = false;
    this.data.powerPelletTimer = 0;
  }

  // AI Interface Methods
  moveGhost(ghostId: string, direction: Direction): boolean {
    const ghost = this.data.ghosts.find(g => g.id === ghostId);
    if (!ghost) return false;

    // STRICT RESURRECTION CONTRACT: Reject moves for eaten/reviving ghosts
    if (ghost.state === GhostState.EATEN || ghost.state === GhostState.REVIVING) {
      return false; // These ghosts must remain immobile
    }

    // CRITICAL: Only accept moves when ghost is idle (no active segment)
    if (ghost.movementSegment !== null) {
      return false; // Ghost is busy moving
    }

    // Only proceed if ghost is idle on a tile
    const nextPos = this.getNextPosition(ghost.position, direction);
    if (this.isValidMove(nextPos)) {
      const fromTile = { ...ghost.position };
      const toTile = { ...nextPos };
      
      // Handle tunnel wrapping for ghosts too
      if (toTile.x < 0) {
        toTile.x = this.data.maze[0].length - 1;
      } else if (toTile.x >= this.data.maze[0].length) {
        toTile.x = 0;
      }
      
      // Create new segment
      ghost.movementSegment = {
        fromTile,
        toTile,
        startTime: Date.now(),
        duration: this.LOGIC_UPDATE_RATE
      };
      
      console.log(`[${ghostId.toUpperCase()}] New segment: (${fromTile.x},${fromTile.y}) -> (${toTile.x},${toTile.y})`);
      
      // Update grid position
      ghost.position = toTile;
      ghost.direction = direction;
      
      return true;
    }
    return false;
  }

  getLogicUpdateRate(): number {
    return this.LOGIC_UPDATE_RATE;
  }

  getDistanceBetween(pos1: Position, pos2: Position): number {
    return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
  }

  // Speech Bubble System
  private updateSpeechBubbles(): void {
    const now = Date.now();
    // Remove expired speech bubbles
    this.data.speechBubbles = this.data.speechBubbles.filter(
      bubble => now < bubble.startTime + bubble.duration
    );
  }

  addSpeechBubble(ghostId: string, text: string): boolean {
    const ghost = this.data.ghosts.find(g => g.id === ghostId);
    if (!ghost) return false;

    const now = Date.now();
    
    // Check cooldown
    if (now - ghost.lastSpeechTime < this.SPEECH_COOLDOWN) {
      return false; // Still in cooldown
    }

    // Remove any existing bubble for this ghost
    this.data.speechBubbles = this.data.speechBubbles.filter(
      bubble => bubble.ghostId !== ghostId
    );

    // Add new bubble
    this.data.speechBubbles.push({
      ghostId,
      text,
      startTime: now,
      duration: this.SPEECH_BUBBLE_DURATION
    });

    // Update ghost's last speech time
    ghost.lastSpeechTime = now;

    return true;
  }

  // Cleanup
  destroy(): void {
    this.stopGameLoop();
  }
}