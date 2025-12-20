// Snake Game Logic - Classic snake mechanics with clean separation

export interface Position {
  x: number;
  y: number;
}

export enum Direction {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT'
}

export enum GameState {
  READY = 'READY',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER'
}

export interface SnakeGameData {
  snake: Position[];
  food: Position;
  fakeFoods: Position[];
  environmentalBlocks: Position[];
  direction: Direction;
  nextDirection: Direction;
  score: number;
  gameState: GameState;
  gridWidth: number;
  gridHeight: number;
  moveCount: number;
  startTime: Date | null;
  endTime: Date | null;
  speedMultiplier: number;
  environmentalEffects: {
    colorShift: number;
    gridTension: boolean;
    foodPulseRate: number;
  };
  hasWon: boolean;
  deathCause: 'wall' | 'self' | 'block' | null;
}

export class SnakeGame {
  private data: SnakeGameData;
  private gameLoop: number | null = null;
  private readonly BASE_GAME_SPEED = 150; // milliseconds between moves
  private currentGameSpeed = 150;
  private aiUpdateCallback: ((
    snake: Position[],
    food: Position,
    gridWidth: number,
    gridHeight: number,
    snakeLength: number
  ) => {
    speedMultiplier: number;
    fakeFoods: Position[];
    environmentalBlocks: Position[];
    foodSpawnBias: { wallBias: number; bodyBias: number; safeSpaceReduction: number };
    environmentalEffects: {
      colorShift: number;
      gridTension: boolean;
      foodPulseRate: number;
    };
    hasWon: boolean;
    commentaryEvents: any[];
  }) | null = null;
  private fakeFoodApproachedCallback: ((position: Position) => { disappeared: boolean; commentary: string | null }) | null = null;
  private realFoodEatenCallback: (() => void) | null = null;
  private biasedFoodCallback: ((
    snake: Position[],
    gridWidth: number,
    gridHeight: number,
    normalPosition: Position
  ) => Position) | null = null;

  constructor(gridWidth: number = 20, gridHeight: number = 20) {
    this.data = {
      snake: [{ x: Math.floor(gridWidth / 2), y: Math.floor(gridHeight / 2) }],
      food: this.generateFood(gridWidth, gridHeight, [{ x: Math.floor(gridWidth / 2), y: Math.floor(gridHeight / 2) }]),
      fakeFoods: [],
      environmentalBlocks: [],
      direction: Direction.RIGHT,
      nextDirection: Direction.RIGHT,
      score: 0,
      gameState: GameState.READY,
      gridWidth,
      gridHeight,
      moveCount: 0,
      startTime: null,
      endTime: null,
      speedMultiplier: 1.0,
      environmentalEffects: {
        colorShift: 0,
        gridTension: false,
        foodPulseRate: 1.0
      },
      hasWon: false,
      deathCause: null
    };
  }

  // Public API for game control
  start(): void {
    if (this.data.gameState === GameState.READY) {
      this.data.gameState = GameState.PLAYING;
      this.data.startTime = new Date();
      this.startGameLoop();
    }
  }

  pause(): void {
    if (this.data.gameState === GameState.PLAYING) {
      this.stopGameLoop();
    }
  }

  resume(): void {
    if (this.data.gameState === GameState.PLAYING) {
      this.startGameLoop();
    }
  }

  reset(): void {
    this.stopGameLoop();
    const { gridWidth, gridHeight } = this.data;
    this.data = {
      snake: [{ x: Math.floor(gridWidth / 2), y: Math.floor(gridHeight / 2) }],
      food: this.generateFood(gridWidth, gridHeight, [{ x: Math.floor(gridWidth / 2), y: Math.floor(gridHeight / 2) }]),
      fakeFoods: [],
      environmentalBlocks: [],
      direction: Direction.RIGHT,
      nextDirection: Direction.RIGHT,
      score: 0,
      gameState: GameState.READY,
      gridWidth,
      gridHeight,
      moveCount: 0,
      startTime: null,
      endTime: null,
      speedMultiplier: 1.0,
      environmentalEffects: {
        colorShift: 0,
        gridTension: false,
        foodPulseRate: 1.0
      },
      hasWon: false,
      deathCause: null
    };
    this.currentGameSpeed = this.BASE_GAME_SPEED;
  }

  // Input handling
  setDirection(newDirection: Direction): void {
    if (this.data.gameState !== GameState.PLAYING) return;

    // Prevent reversing into self
    const opposites = {
      [Direction.UP]: Direction.DOWN,
      [Direction.DOWN]: Direction.UP,
      [Direction.LEFT]: Direction.RIGHT,
      [Direction.RIGHT]: Direction.LEFT
    };

    if (opposites[newDirection] !== this.data.direction) {
      this.data.nextDirection = newDirection;
    }
  }

  // AI Integration Methods
  setAIUpdateCallback(callback: (
    snake: Position[],
    food: Position,
    gridWidth: number,
    gridHeight: number,
    snakeLength: number
  ) => {
    speedMultiplier: number;
    fakeFoods: Position[];
    environmentalBlocks: Position[];
    foodSpawnBias: { wallBias: number; bodyBias: number; safeSpaceReduction: number };
    environmentalEffects: {
      colorShift: number;
      gridTension: boolean;
      foodPulseRate: number;
    };
    hasWon: boolean;
    commentaryEvents: any[];
  }): void {
    this.aiUpdateCallback = callback;
  }

  setFakeFoodApproachedCallback(callback: (position: Position) => { disappeared: boolean; commentary: string | null }): void {
    this.fakeFoodApproachedCallback = callback;
  }

  setRealFoodEatenCallback(callback: () => void): void {
    this.realFoodEatenCallback = callback;
  }

  setBiasedFoodCallback(callback: (
    snake: Position[],
    gridWidth: number,
    gridHeight: number,
    normalPosition: Position
  ) => Position): void {
    this.biasedFoodCallback = callback;
  }

  // Game state access (for AI hooks)
  getGameData(): Readonly<SnakeGameData> {
    return { ...this.data };
  }

  getSnakeLength(): number {
    return this.data.snake.length;
  }

  getCurrentDirection(): Direction {
    return this.data.direction;
  }

  getScore(): number {
    return this.data.score;
  }

  getMoveCount(): number {
    return this.data.moveCount;
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
    }, this.currentGameSpeed);
  }

  private updateGameSpeed(): void {
    if (this.gameLoop) {
      clearInterval(this.gameLoop);
      this.currentGameSpeed = Math.max(50, this.BASE_GAME_SPEED / this.data.speedMultiplier);
      this.gameLoop = window.setInterval(() => {
        this.update();
      }, this.currentGameSpeed);
    }
  }

  private stopGameLoop(): void {
    if (this.gameLoop) {
      clearInterval(this.gameLoop);
      this.gameLoop = null;
    }
  }

  private update(): void {
    if (this.data.gameState !== GameState.PLAYING) return;

    // AI CORRUPTION UPDATE
    if (this.aiUpdateCallback) {
      const aiUpdate = this.aiUpdateCallback(
        this.data.snake,
        this.data.food,
        this.data.gridWidth,
        this.data.gridHeight,
        this.data.snake.length
      );

      // Update speed multiplier and game speed
      const oldSpeedMultiplier = this.data.speedMultiplier;
      this.data.speedMultiplier = aiUpdate.speedMultiplier;
      if (oldSpeedMultiplier !== this.data.speedMultiplier) {
        this.updateGameSpeed();
      }

      // Update fake foods (ADDITIVE, not replacement)
      this.data.fakeFoods = aiUpdate.fakeFoods;

      // Update environmental blocks
      this.data.environmentalBlocks = aiUpdate.environmentalBlocks;

      // Update environmental effects
      this.data.environmentalEffects = aiUpdate.environmentalEffects;

      // Check win condition
      this.data.hasWon = aiUpdate.hasWon;
    }

    // Update direction
    this.data.direction = this.data.nextDirection;

    // Calculate new head position
    const head = { ...this.data.snake[0] };
    switch (this.data.direction) {
      case Direction.UP:
        head.y -= 1;
        break;
      case Direction.DOWN:
        head.y += 1;
        break;
      case Direction.LEFT:
        head.x -= 1;
        break;
      case Direction.RIGHT:
        head.x += 1;
        break;
    }

    // Check wall collision
    if (head.x < 0 || head.x >= this.data.gridWidth || 
        head.y < 0 || head.y >= this.data.gridHeight) {
      this.data.deathCause = 'wall';
      this.gameOver();
      return;
    }

    // Check self collision
    if (this.data.snake.some(segment => segment.x === head.x && segment.y === head.y)) {
      this.data.deathCause = 'self';
      this.gameOver();
      return;
    }

    // Check environmental block collision
    if (this.data.environmentalBlocks.some(block => block.x === head.x && block.y === head.y)) {
      this.data.deathCause = 'block';
      this.gameOver();
      return;
    }

    // Add new head
    this.data.snake.unshift(head);
    this.data.moveCount++;

    let foodEaten = false;

    // Check fake food collisions (CRITICAL FIX: Don't block progression)
    for (let i = this.data.fakeFoods.length - 1; i >= 0; i--) {
      const fakeFood = this.data.fakeFoods[i];
      if (head.x === fakeFood.x && head.y === fakeFood.y) {
        // Remove this fake food
        this.data.fakeFoods.splice(i, 1);
        
        // Trigger fake food approached callback
        if (this.fakeFoodApproachedCallback) {
          this.fakeFoodApproachedCallback(fakeFood);
        }
        
        // CRITICAL: Don't return here - continue to check real food
        // Fake food disappears but doesn't stop the snake
      }
    }

    // Check real food collision (ALWAYS PROCESSED)
    if (head.x === this.data.food.x && head.y === this.data.food.y) {
      this.data.score += 10;
      foodEaten = true;
      
      // Notify AI of real food eaten
      if (this.realFoodEatenCallback) {
        this.realFoodEatenCallback();
      }
      
      // Generate new food (potentially biased)
      let newFood = this.generateFood(this.data.gridWidth, this.data.gridHeight, this.data.snake);
      if (this.biasedFoodCallback) {
        newFood = this.biasedFoodCallback(this.data.snake, this.data.gridWidth, this.data.gridHeight, newFood);
      }
      this.data.food = newFood;
    }

    // Remove tail only if no real food was eaten
    if (!foodEaten) {
      this.data.snake.pop();
    }
  }

  private gameOver(): void {
    this.data.gameState = GameState.GAME_OVER;
    this.data.endTime = new Date();
    this.stopGameLoop();
  }

  private generateFood(gridWidth: number, gridHeight: number, snake: Position[]): Position {
    let food: Position;
    do {
      food = {
        x: Math.floor(Math.random() * gridWidth),
        y: Math.floor(Math.random() * gridHeight)
      };
    } while (snake.some(segment => segment.x === food.x && segment.y === food.y));
    
    return food;
  }

  // Cleanup
  destroy(): void {
    this.stopGameLoop();
  }
}