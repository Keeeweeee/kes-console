// Block Breaker Corruption System - AI interference mechanics

export interface CorruptionState {
  level: number; // 0-3
  ballSpeedMultiplier: number;
  paddleWidthMultiplier: number;
  paddleDrift: number; // pixels per frame
  fakeBlocks: Array<{ x: number; y: number; width: number; height: number; flickering: boolean }>;
  regeneratingBlocks: Array<{ x: number; y: number; width: number; height: number; opacity: number }>;
  stubbornBlocks: Array<{ x: number; y: number; width: number; height: number }>;
  bounceAngleBias: number; // -1 to 1, affects ball physics
  speedSpikeActive: boolean;
  speedSpikeTimer: number;
}

export interface CorruptionTriggers {
  missedBalls: number;
  paddleCamping: number; // low movement score
  repeatedAngles: number; // same bounce patterns
  timePerBlock: number; // milliseconds per block destroyed
  blocksDestroyed: number;
}

export class BlockBreakerCorruptionSystem {
  private state: CorruptionState;
  private triggers: CorruptionTriggers;
  private lastPaddlePosition: number = 0;
  private paddleMovementHistory: number[] = [];
  private bounceAngleHistory: number[] = [];
  private lastBlockDestroyTime: number = 0;

  constructor() {
    this.state = {
      level: 0,
      ballSpeedMultiplier: 1.0,
      paddleWidthMultiplier: 1.0,
      paddleDrift: 0,
      fakeBlocks: [],
      regeneratingBlocks: [],
      stubbornBlocks: [],
      bounceAngleBias: 0,
      speedSpikeActive: false,
      speedSpikeTimer: 0
    };

    this.triggers = {
      missedBalls: 0,
      paddleCamping: 0,
      repeatedAngles: 0,
      timePerBlock: 0,
      blocksDestroyed: 0
    };
  }

  // Initialize for new game
  reset(): void {
    this.state = {
      level: 0,
      ballSpeedMultiplier: 1.0,
      paddleWidthMultiplier: 1.0,
      paddleDrift: 0,
      fakeBlocks: [],
      regeneratingBlocks: [],
      stubbornBlocks: [],
      bounceAngleBias: 0,
      speedSpikeActive: false,
      speedSpikeTimer: 0
    };

    this.triggers = {
      missedBalls: 0,
      paddleCamping: 0,
      repeatedAngles: 0,
      timePerBlock: 0,
      blocksDestroyed: 0
    };

    this.paddleMovementHistory = [];
    this.bounceAngleHistory = [];
  }

  // Track paddle movement for camping detection
  trackPaddleMovement(paddleX: number): void {
    const movement = Math.abs(paddleX - this.lastPaddlePosition);
    this.paddleMovementHistory.push(movement);
    
    // Keep only last 60 frames (1 second at 60fps)
    if (this.paddleMovementHistory.length > 60) {
      this.paddleMovementHistory.shift();
    }
    
    // Calculate camping score (low movement = high camping)
    const avgMovement = this.paddleMovementHistory.reduce((a, b) => a + b, 0) / this.paddleMovementHistory.length;
    this.triggers.paddleCamping = Math.max(0, 10 - avgMovement); // Higher score = more camping
    
    this.lastPaddlePosition = paddleX;
  }

  // Track ball missed
  onBallMissed(): void {
    this.triggers.missedBalls++;
  }

  // Track paddle hit with bounce angle
  onPaddleHit(bounceAngle: number): void {
    this.bounceAngleHistory.push(bounceAngle);
    
    // Keep only last 10 bounces
    if (this.bounceAngleHistory.length > 10) {
      this.bounceAngleHistory.shift();
    }
    
    // Calculate repeated angle score
    if (this.bounceAngleHistory.length >= 5) {
      const recentAngles = this.bounceAngleHistory.slice(-5);
      const angleVariance = this.calculateVariance(recentAngles);
      this.triggers.repeatedAngles = Math.max(0, 10 - angleVariance * 10); // Low variance = high repetition
    }
  }

  // Track block destruction
  onBlockDestroyed(): void {
    const now = Date.now();
    this.triggers.blocksDestroyed++;
    
    if (this.lastBlockDestroyTime > 0) {
      const timeDiff = now - this.lastBlockDestroyTime;
      this.triggers.timePerBlock = timeDiff;
    }
    
    this.lastBlockDestroyTime = now;
    
    // Check if corruption should trigger by block count - start immediately at 5th block
    if (this.triggers.blocksDestroyed === 5) {
      this.evaluateCorruption();
    } else if (this.triggers.blocksDestroyed > 5) {
      this.evaluateCorruption();
    }
  }

  // Main corruption evaluation
  private evaluateCorruption(): boolean {
    const oldLevel = this.state.level;
    
    // Level 1: Basic interference - starts immediately at 5th block destroyed
    if (this.state.level === 0 && this.triggers.blocksDestroyed >= 5) {
      this.state.level = 1;
      this.applyLevel1Corruption();
    }
    
    // Level 2: Moderate interference (multiple triggers OR time-based)
    else if (this.state.level === 1 && (
      (this.triggers.missedBalls >= 1 && this.triggers.paddleCamping >= 5) ||
      this.triggers.timePerBlock > 8000 || // 8+ seconds per block
      this.triggers.blocksDestroyed >= 15
    )) {
      this.state.level = 2;
      this.applyLevel2Corruption();
    }
    
    // Level 3: Heavy interference (persistent poor play)
    else if (this.state.level === 2 && (
      this.triggers.missedBalls >= 4 ||
      (this.triggers.paddleCamping >= 8 && this.triggers.repeatedAngles >= 7) ||
      this.triggers.blocksDestroyed >= 25
    )) {
      this.state.level = 3;
      this.applyLevel3Corruption();
    }
    
    // Return whether level changed for commentary
    return oldLevel !== this.state.level;
  }

  private applyLevel1Corruption(): void {
    // Ball speed increases significantly
    this.state.ballSpeedMultiplier = 1.4; // Much faster
    
    // Occasional commentary (handled by caller)
  }

  private applyLevel2Corruption(): void {
    // Ball speed increases more
    this.state.ballSpeedMultiplier = 1.6; // Even faster
    
    // Mass regenerate blocks (10-15 blocks)
    this.massRegenerateBlocks();
    
    // Paddle width subtly shrinks
    this.state.paddleWidthMultiplier = 0.85;
    
    // Ball bounce angles become less forgiving
    this.state.bounceAngleBias = 0.3;
    
    // Subtle paddle drift
    this.state.paddleDrift = 0.5;
  }

  private applyLevel3Corruption(): void {
    // Fake blocks appear
    this.generateFakeBlocks();
    
    // Stubborn blocks appear
    this.generateStubbornBlocks();
    
    // Ball speed very fast
    this.state.ballSpeedMultiplier = 1.8; // Very fast
    
    // Stronger paddle drift
    this.state.paddleDrift = 1.2;
    
    // More aggressive bounce bias
    this.state.bounceAngleBias = 0.5;
  }



  private generateFakeBlocks(): void {
    // Generate 2-3 fake blocks in block grid positions
    const fakeBlockCount = 2 + Math.floor(Math.random() * 2);
    const BLOCK_WIDTH = 70;
    const BLOCK_HEIGHT = 20;
    const BLOCK_PADDING = 5;
    const BLOCK_COLS = 10;
    const BLOCK_ROWS = 6;
    
    for (let i = 0; i < fakeBlockCount; i++) {
      // Generate random grid position
      const col = Math.floor(Math.random() * BLOCK_COLS);
      const row = Math.floor(Math.random() * BLOCK_ROWS);
      
      const x = col * (BLOCK_WIDTH + BLOCK_PADDING) + BLOCK_PADDING + 50;
      const y = row * (BLOCK_HEIGHT + BLOCK_PADDING) + BLOCK_PADDING + 50;
      
      this.state.fakeBlocks.push({
        x,
        y,
        width: BLOCK_WIDTH,
        height: BLOCK_HEIGHT,
        flickering: true
      });
    }
  }

  // Update corruption effects each frame
  update(): void {
    // Handle speed spikes
    if (this.state.speedSpikeActive) {
      this.state.speedSpikeTimer--;
      if (this.state.speedSpikeTimer <= 0) {
        this.state.speedSpikeActive = false;
        this.state.ballSpeedMultiplier = this.state.level >= 3 ? 1.3 : (this.state.level >= 1 ? 1.1 : 1.0);
      }
    }
    
    // Random ball speed variations during corruption (only if not in speed spike)
    if (!this.state.speedSpikeActive) {
      if (this.state.level >= 2) {
        const baseSpeed = this.state.level >= 3 ? 1.8 : 1.6;
        const variation = 0.3 * Math.sin(Date.now() * 0.005); // Smooth variation
        this.state.ballSpeedMultiplier = baseSpeed + variation;
      } else if (this.state.level === 1) {
        // Level 1 gets consistent faster speed
        this.state.ballSpeedMultiplier = 1.4;
      }
    }
    
    // Random paddle size variations during corruption
    if (this.state.level >= 2) {
      const baseWidth = this.state.level >= 3 ? 0.7 : 0.85;
      const variation = 0.1 * Math.sin(Date.now() * 0.003 + Math.PI); // Different phase
      this.state.paddleWidthMultiplier = Math.max(0.5, baseWidth + variation);
    }
    
    // Update regenerating blocks opacity (faster)
    this.state.regeneratingBlocks.forEach(block => {
      block.opacity = Math.min(1.0, block.opacity + 0.05); // Fade in over ~20 frames (faster)
    });
    
    // Remove fully regenerated blocks (they become real blocks)
    this.state.regeneratingBlocks = this.state.regeneratingBlocks.filter(block => block.opacity < 1.0);
  }

  // Trigger speed spike after clean hit
  triggerSpeedSpike(): void {
    if (this.state.level >= 3) {
      this.state.speedSpikeActive = true;
      this.state.speedSpikeTimer = 120; // 2 seconds at 60fps
      this.state.ballSpeedMultiplier = 1.8; // Brief spike
    }
  }

  // Remove fake block when hit
  removeFakeBlock(x: number, y: number): boolean {
    const index = this.state.fakeBlocks.findIndex(block => 
      Math.abs(block.x - x) < 35 && Math.abs(block.y - y) < 10
    );
    
    if (index !== -1) {
      this.state.fakeBlocks.splice(index, 1);
      return true;
    }
    return false;
  }

  // Add regenerating block
  addRegeneratingBlock(x: number, y: number, width: number, height: number): void {
    this.state.regeneratingBlocks.push({
      x, y, width, height, opacity: 0
    });
  }

  private calculateVariance(numbers: number[]): number {
    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
    return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / numbers.length);
  }

  // Getters
  getCorruptionState(): CorruptionState {
    return { ...this.state };
  }

  getCorruptionLevel(): number {
    return this.state.level;
  }

  getTriggers(): CorruptionTriggers {
    return { ...this.triggers };
  }

  // Check if corruption level changed (for commentary)
  checkLevelChange(): boolean {
    return this.evaluateCorruption();
  }

  // Get blocks that have fully regenerated and should become real blocks
  getFullyRegeneratedBlocks(): Array<{ x: number; y: number; width: number; height: number }> {
    return this.state.regeneratingBlocks.filter(block => block.opacity >= 1.0);
  }

  // Remove regenerating block when hit
  removeRegeneratingBlock(x: number, y: number): boolean {
    const index = this.state.regeneratingBlocks.findIndex(block => 
      Math.abs(block.x - x) < 35 && Math.abs(block.y - y) < 10
    );
    
    if (index !== -1) {
      this.state.regeneratingBlocks.splice(index, 1);
      return true;
    }
    return false;
  }

  // Get total count of blocks that prevent win condition (only regenerating blocks count as real blocks)
  getTotalBlockCount(): number {
    return this.state.regeneratingBlocks.length;
  }

  // Generate stubborn blocks (can't be hit)
  generateStubbornBlocks(): void {
    const stubbornBlockCount = 3 + Math.floor(Math.random() * 3); // 3-5 stubborn blocks
    const BLOCK_WIDTH = 70;
    const BLOCK_HEIGHT = 20;
    const BLOCK_PADDING = 5;
    const BLOCK_COLS = 10;
    const BLOCK_ROWS = 6;
    
    for (let i = 0; i < stubbornBlockCount; i++) {
      const col = Math.floor(Math.random() * BLOCK_COLS);
      const row = Math.floor(Math.random() * BLOCK_ROWS);
      
      const x = col * (BLOCK_WIDTH + BLOCK_PADDING) + BLOCK_PADDING + 50;
      const y = row * (BLOCK_HEIGHT + BLOCK_PADDING) + BLOCK_PADDING + 50;
      
      this.state.stubbornBlocks.push({
        x, y, width: BLOCK_WIDTH, height: BLOCK_HEIGHT
      });
    }
  }

  // Mass regenerate blocks (10-15 blocks with delay)
  massRegenerateBlocks(): void {
    const regenCount = 10 + Math.floor(Math.random() * 6); // 10-15 blocks
    const BLOCK_WIDTH = 70;
    const BLOCK_HEIGHT = 20;
    const BLOCK_PADDING = 5;
    const BLOCK_COLS = 10;
    const BLOCK_ROWS = 6;
    
    for (let i = 0; i < regenCount; i++) {
      const col = Math.floor(Math.random() * BLOCK_COLS);
      const row = Math.floor(Math.random() * BLOCK_ROWS);
      
      const x = col * (BLOCK_WIDTH + BLOCK_PADDING) + BLOCK_PADDING + 50;
      const y = row * (BLOCK_HEIGHT + BLOCK_PADDING) + BLOCK_PADDING + 50;
      
      // Add with delay (500ms)
      setTimeout(() => {
        this.state.regeneratingBlocks.push({
          x, y, width: BLOCK_WIDTH, height: BLOCK_HEIGHT, opacity: 0
        });
      }, 500); // 500ms delay
    }
  }

  // Check collision with stubborn blocks
  checkStubbornBlockCollision(x: number, y: number): boolean {
    return this.state.stubbornBlocks.some(block => 
      Math.abs(block.x - x) < 35 && Math.abs(block.y - y) < 10
    );
  }

  // Get stubborn blocks
  getStubbornBlocks(): Array<{ x: number; y: number; width: number; height: number }> {
    return this.state.stubbornBlocks;
  }
}