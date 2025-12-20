// Snake Visible Corruption System - Escalating antagonistic punishment

import { 
  PunishmentState, 
  PunishmentType, 
  SnakeBehaviorMetrics,
  PlayerBehaviorType,
  CorruptionLevel
} from './SnakeBehaviorTypes';
import { SnakeBehaviorTracker } from './SnakeBehaviorTracker';

export class SnakePunishmentSystem {
  private punishmentState: PunishmentState;
  private lastCommentaryTime = 0;
  private readonly COMMENTARY_COOLDOWN_MIN = 3000; // 3 seconds minimum
  private readonly COMMENTARY_COOLDOWN_MAX = 5000; // 5 seconds maximum
  private activePunishments: Set<PunishmentType> = new Set();
  private gameStartTime = 0;
  private lastFoodEaten = 0;
  private speedEscalationTimer = 0;
  private lastSpeedIncrease = 0;

  constructor() {
    this.punishmentState = {
      corruptionLevel: CorruptionLevel.OBSERVATION,
      corruptionStartTime: 0,
      fakeFood: {
        active: false,
        position: null,
        triggerReason: '',
        flickerState: false,
        lastFlicker: 0
      },
      environmentalBlocks: [],
      lastBlockSpawn: 0,
      foodEatenSinceLastBlock: 0,
      speedMultiplier: 1.0,
      speedSurgeActive: false,
      speedFluctuationActive: false,
      foodBias: {
        wallBias: 0,
        bodyBias: 0,
        safeSpaceReduction: 0
      },
      pathPrediction: {
        active: false,
        predictedPath: [],
        biasStrength: 0
      },
      environmentalEffects: {
        colorShift: 0,
        gridTension: false,
        foodPulseRate: 1.0
      }
    };
  }

  // VISIBLE CORRUPTION PHASE - Main evaluation called every game update
  evaluateCorruption(
    behaviorTracker: SnakeBehaviorTracker,
    currentSnake: { x: number; y: number }[],
    currentFood: { x: number; y: number },
    gridWidth: number,
    gridHeight: number,
    snakeLength: number,
    timeAlive: number,
    hasWon: boolean = false
  ): {
    fakeFoods: { x: number; y: number }[];
    environmentalBlocks: { x: number; y: number }[];
    newSpeedMultiplier: number;
    foodSpawnBias: { wallBias: number; bodyBias: number; safeSpaceReduction: number };
    corruptionTriggered: { type: string; reason: string; level: CorruptionLevel } | null;
    midGameCommentary: string | null;
    environmentalEffects: {
      colorShift: number;
      gridTension: boolean;
      foodPulseRate: number;
    };
  } {
    const now = Date.now();
    
    if (this.gameStartTime === 0) {
      this.gameStartTime = now;
      this.punishmentState.corruptionStartTime = now;
    }

    // 1. UPDATE CORRUPTION LEVEL (MANDATORY ESCALATION)
    const previousLevel = this.punishmentState.corruptionLevel;
    this.updateCorruptionLevel(timeAlive, snakeLength);
    
    let corruptionTriggered: { type: string; reason: string; level: CorruptionLevel } | null = null;
    if (this.punishmentState.corruptionLevel > previousLevel) {
      corruptionTriggered = {
        type: 'corruption_level_change',
        reason: `Escalated to Level ${this.punishmentState.corruptionLevel}`,
        level: this.punishmentState.corruptionLevel
      };
    }

    // 2. FAKE FOOD SYSTEM (FREQUENT & VISIBLE)
    this.updateFakeFood(behaviorTracker, currentFood, now);

    // 3. SPEED CORRUPTION (OBVIOUS)
    this.updateSpeedCorruption(behaviorTracker, now, timeAlive);

    // 4. FOOD PLACEMENT AS WEAPON
    this.updateFoodBias(behaviorTracker, currentSnake);

    // 5. MID-GAME COMMENTARY (NON-NEGOTIABLE)
    const midGameCommentary = this.generateMidGameCommentary(now, behaviorTracker);

    // 6. ENVIRONMENTAL BLOCKS (CORRUPTION ≥ 2)
    this.updateEnvironmentalBlocks(currentSnake, currentFood, gridWidth, gridHeight, hasWon);

    // 7. ENVIRONMENTAL CORRUPTION
    this.updateEnvironmentalEffects();

    return {
      fakeFoods: this.getFakeFoods(),
      environmentalBlocks: this.punishmentState.environmentalBlocks,
      newSpeedMultiplier: this.punishmentState.speedMultiplier,
      foodSpawnBias: this.punishmentState.foodBias,
      corruptionTriggered,
      midGameCommentary,
      environmentalEffects: this.punishmentState.environmentalEffects
    };
  }

  // 1. CORRUPTION LEVEL ESCALATION (MANDATORY)
  private updateCorruptionLevel(timeAlive: number, snakeLength: number): void {
    const timeSeconds = timeAlive / 1000;
    
    // Level 0 → 1: After 10 seconds OR 5 food
    if (this.punishmentState.corruptionLevel === CorruptionLevel.OBSERVATION) {
      if (timeSeconds >= 10 || snakeLength >= 6) {
        this.punishmentState.corruptionLevel = CorruptionLevel.SUBTLE_INTERFERENCE;
      }
    }
    // Level 1 → 2: After 20 seconds OR 10 food
    else if (this.punishmentState.corruptionLevel === CorruptionLevel.SUBTLE_INTERFERENCE) {
      if (timeSeconds >= 20 || snakeLength >= 11) {
        this.punishmentState.corruptionLevel = CorruptionLevel.ACTIVE_MANIPULATION;
      }
    }
    // Level 2 → 3: After 30 seconds OR 15 food
    else if (this.punishmentState.corruptionLevel === CorruptionLevel.ACTIVE_MANIPULATION) {
      if (timeSeconds >= 30 || snakeLength >= 16) {
        this.punishmentState.corruptionLevel = CorruptionLevel.HOSTILE_TAKEOVER;
      }
    }
  }

  // 2. FAKE FOOD SYSTEM (FIX IT PROPERLY)
  private updateFakeFood(behaviorTracker: SnakeBehaviorTracker, currentFood: { x: number; y: number }, now: number): void {
    // Update flicker state
    if (this.punishmentState.fakeFood.active && now - this.punishmentState.fakeFood.lastFlicker > 200) {
      this.punishmentState.fakeFood.flickerState = !this.punishmentState.fakeFood.flickerState;
      this.punishmentState.fakeFood.lastFlicker = now;
    }

    // Spawn fake food based on corruption level
    if (!this.punishmentState.fakeFood.active) {
      let shouldSpawn = false;
      let reason = '';

      if (this.punishmentState.corruptionLevel >= CorruptionLevel.SUBTLE_INTERFERENCE) {
        // Level 1+: 25% minimum chance
        if (Math.random() < 0.25) {
          shouldSpawn = true;
          reason = "You're playing it safe. I hate that.";
        }
      }

      if (this.punishmentState.corruptionLevel >= CorruptionLevel.ACTIVE_MANIPULATION) {
        // Level 2+: MUST spawn after every real food at least once
        if (this.lastFoodEaten > 0 && now - this.lastFoodEaten > 1000) {
          shouldSpawn = true;
          reason = "That food wasn't for you.";
        }
      }

      // Comfort detection trigger
      const metrics = behaviorTracker.calculateMetrics();
      if (metrics.comfortZoneSize > 0.7 && metrics.riskTolerance < 0.2) {
        shouldSpawn = true;
        reason = "Comfort detected. Let's fix that.";
      }

      if (shouldSpawn) {
        this.activateFakeFood(reason, currentFood);
      }
    }
  }

  private activateFakeFood(reason: string, currentFood: { x: number; y: number }): void {
    this.punishmentState.fakeFood = {
      active: true,
      position: { ...currentFood },
      triggerReason: reason,
      flickerState: false,
      lastFlicker: Date.now()
    };
    this.activePunishments.add(PunishmentType.FAKE_FOOD);
  }

  // 3. SPEED CORRUPTION (MAKE IT OBVIOUS)
  private updateSpeedCorruption(behaviorTracker: SnakeBehaviorTracker, now: number, timeAlive: number): void {
    const metrics = behaviorTracker.calculateMetrics();
    
    // Base speed increase over time (gradual but noticeable)
    const timeSeconds = timeAlive / 1000;
    const baseSpeedIncrease = 1.0 + (timeSeconds / 30) * 0.5; // +50% over 30 seconds
    this.punishmentState.speedMultiplier = Math.max(this.punishmentState.speedMultiplier, baseSpeedIncrease);
    
    // Comfort detection: Increase speed every 3 seconds (more aggressive)
    if (metrics.comfortZoneSize > 0.6 && now - this.lastSpeedIncrease > 3000) {
      this.punishmentState.speedMultiplier += 0.1; // +10% every 3 seconds
      this.lastSpeedIncrease = now;
    }

    // Level 2+: Speed surges after eating food
    if (this.punishmentState.corruptionLevel >= CorruptionLevel.ACTIVE_MANIPULATION) {
      if (this.lastFoodEaten > 0 && now - this.lastFoodEaten < 800) {
        this.punishmentState.speedSurgeActive = true;
        this.punishmentState.speedMultiplier *= 1.5; // 50% surge
      } else if (this.punishmentState.speedSurgeActive && now - this.lastFoodEaten > 1500) {
        this.punishmentState.speedSurgeActive = false;
        this.punishmentState.speedMultiplier /= 1.5; // Return to normal
      }
    }

    // Level 3: Unpredictable fluctuations
    if (this.punishmentState.corruptionLevel >= CorruptionLevel.HOSTILE_TAKEOVER) {
      if (!this.punishmentState.speedFluctuationActive && Math.random() < 0.15) {
        this.punishmentState.speedFluctuationActive = true;
        this.speedEscalationTimer = now + 3000; // 3 second fluctuation
      }
      
      if (this.punishmentState.speedFluctuationActive) {
        if (now < this.speedEscalationTimer) {
          // Fluctuate between 0.7x and 1.8x (more dramatic)
          const fluctuation = 0.7 + 1.1 * Math.sin((now - (this.speedEscalationTimer - 3000)) / 150);
          this.punishmentState.speedMultiplier = Math.max(0.7, Math.min(1.8, fluctuation));
        } else {
          this.punishmentState.speedFluctuationActive = false;
          // Don't reset to 1.0, maintain base speed
        }
      }
    }

    // Cap speed at 3.0x (higher cap for more punishment)
    this.punishmentState.speedMultiplier = Math.min(3.0, this.punishmentState.speedMultiplier);
  }

  // 4. FOOD PLACEMENT AS WEAPON
  private updateFoodBias(behaviorTracker: SnakeBehaviorTracker, currentSnake: { x: number; y: number }[]): void {
    const metrics = behaviorTracker.calculateMetrics();
    
    // Cautious play detected: Spawn food near walls
    if (metrics.comfortZoneSize > 0.7) {
      this.punishmentState.foodBias.wallBias = 0.6; // 60% chance near walls
    }

    // Predictable turns detected: Spawn food behind snake
    const maxTurnBias = Math.max(
      metrics.turnBias.left, 
      metrics.turnBias.right, 
      metrics.turnBias.up, 
      metrics.turnBias.down
    );
    if (maxTurnBias > 0.4) {
      this.punishmentState.foodBias.bodyBias = 0.5; // Force U-turns
    }

    // Greed with wall avoidance
    if (metrics.lengthBasedGreedThreshold > 0.3 && metrics.wallHuggingFrequency < 0.2) {
      this.punishmentState.foodBias.wallBias = Math.min(0.8, metrics.lengthBasedGreedThreshold);
    }
  }

  // 5. MID-GAME COMMENTARY (NON-NEGOTIABLE)
  private generateMidGameCommentary(now: number, behaviorTracker: SnakeBehaviorTracker): string | null {
    const cooldown = this.COMMENTARY_COOLDOWN_MIN + Math.random() * (this.COMMENTARY_COOLDOWN_MAX - this.COMMENTARY_COOLDOWN_MIN);
    
    if (now - this.lastCommentaryTime < cooldown) {
      return null;
    }

    const metrics = behaviorTracker.calculateMetrics();
    let commentary: string | null = null;

    // Corruption level changes
    if (this.punishmentState.corruptionLevel >= CorruptionLevel.SUBTLE_INTERFERENCE) {
      const corruptionComments = [
        "You're playing it safe. I hate that.",
        "Comfort detected. Let's fix that.",
        "You always turn left. Watch what happens now.",
        "That food wasn't for you.",
        "I'm watching your every move.",
        "Getting comfortable? Not for long."
      ];
      commentary = corruptionComments[Math.floor(Math.random() * corruptionComments.length)];
    }

    // Fake food spawn
    if (this.punishmentState.fakeFood.active && this.punishmentState.fakeFood.triggerReason) {
      commentary = this.punishmentState.fakeFood.triggerReason;
    }

    // Speed escalation
    if (this.punishmentState.speedMultiplier > 1.2) {
      const speedComments = [
        "Too slow. Let me help with that.",
        "Feeling rushed yet?",
        "Speed is life. Literally.",
        "Can't keep up?"
      ];
      commentary = speedComments[Math.floor(Math.random() * speedComments.length)];
    }

    // Pattern exploitation
    const maxTurnBias = Math.max(
      metrics.turnBias.left, 
      metrics.turnBias.right, 
      metrics.turnBias.up, 
      metrics.turnBias.down
    );
    if (maxTurnBias > 0.5) {
      commentary = "You always turn left. Watch what happens now.";
    }

    if (commentary) {
      this.lastCommentaryTime = now;
      return commentary;
    }

    return null;
  }

  // 6. ENVIRONMENTAL BLOCKS (CORRUPTION ≥ 2)
  private updateEnvironmentalBlocks(
    currentSnake: { x: number; y: number }[],
    currentFood: { x: number; y: number },
    gridWidth: number,
    gridHeight: number,
    hasWon: boolean
  ): void {
    // Don't spawn blocks if player has won
    if (hasWon) return;
    
    // Only spawn blocks at corruption level 2+
    if (this.punishmentState.corruptionLevel < CorruptionLevel.ACTIVE_MANIPULATION) return;

    const now = Date.now();
    let shouldSpawnBlock = false;
    
    // Block spawn rate based on corruption level
    if (this.punishmentState.corruptionLevel === CorruptionLevel.ACTIVE_MANIPULATION) {
      // Level 2: every ~5 food
      if (this.punishmentState.foodEatenSinceLastBlock >= 5) {
        shouldSpawnBlock = true;
      }
    } else if (this.punishmentState.corruptionLevel === CorruptionLevel.HOSTILE_TAKEOVER) {
      // Level 3: every 2-3 food
      if (this.punishmentState.foodEatenSinceLastBlock >= 2 + Math.floor(Math.random() * 2)) {
        shouldSpawnBlock = true;
      }
    }

    if (shouldSpawnBlock) {
      const newBlock = this.generateBlockPosition(currentSnake, currentFood, gridWidth, gridHeight);
      if (newBlock) {
        this.punishmentState.environmentalBlocks.push(newBlock);
        this.punishmentState.lastBlockSpawn = now;
        this.punishmentState.foodEatenSinceLastBlock = 0;
      }
    }
  }

  private generateBlockPosition(
    snake: { x: number; y: number }[],
    food: { x: number; y: number },
    gridWidth: number,
    gridHeight: number
  ): { x: number; y: number } | null {
    const maxAttempts = 50;
    const head = snake[0];
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const x = Math.floor(Math.random() * gridWidth);
      const y = Math.floor(Math.random() * gridHeight);
      
      // Never spawn on snake
      if (snake.some(segment => segment.x === x && segment.y === y)) continue;
      
      // Never spawn on food
      if (food.x === x && food.y === y) continue;
      
      // Never spawn adjacent to snake head
      const adjacentToHead = Math.abs(head.x - x) <= 1 && Math.abs(head.y - y) <= 1;
      if (adjacentToHead) continue;
      
      // Never spawn on existing blocks
      if (this.punishmentState.environmentalBlocks.some(block => block.x === x && block.y === y)) continue;
      
      return { x, y };
    }
    
    return null; // Failed to find valid position
  }

  // 7. ENVIRONMENTAL CORRUPTION (SUBTLE FEEDBACK)
  private updateEnvironmentalEffects(): void {
    // Color shift based on corruption level
    this.punishmentState.environmentalEffects.colorShift = this.punishmentState.corruptionLevel * 0.15;

    // Grid tension at level 3
    this.punishmentState.environmentalEffects.gridTension = 
      this.punishmentState.corruptionLevel >= CorruptionLevel.HOSTILE_TAKEOVER;

    // Food pulse changes
    this.punishmentState.environmentalEffects.foodPulseRate = 
      1.0 + (this.punishmentState.corruptionLevel * 0.3);
  }

  private predictSnakePath(snake: { x: number; y: number }[], steps: number): { x: number; y: number }[] {
    if (snake.length < 2) return [];
    
    // Calculate current direction
    const head = snake[0];
    const neck = snake[1];
    const dx = head.x - neck.x;
    const dy = head.y - neck.y;
    
    const path: { x: number; y: number }[] = [];
    let currentX = head.x;
    let currentY = head.y;
    
    // Predict straight-line movement
    for (let i = 0; i < steps; i++) {
      currentX += dx;
      currentY += dy;
      path.push({ x: currentX, y: currentY });
    }
    
    return path;
  }

  // Called when fake food is approached - make it disappear with commentary
  onFakeFoodApproached(position: { x: number; y: number }): { disappeared: boolean; commentary: string | null } {
    // Always return true for fake food disappearance with sassy commentary
    const comments = [
      "You trusted that? Interesting.",
      "Gotcha.",
      "Not so fast.",
      "Did you really think that was real?",
      "Fooled you."
    ];
    
    return { 
      disappeared: true, 
      commentary: comments[Math.floor(Math.random() * comments.length)]
    };
  }

  // Get current fake foods as array
  getFakeFoods(): { x: number; y: number }[] {
    const fakeFoods: { x: number; y: number }[] = [];
    
    // Add active fake food if exists
    if (this.punishmentState.fakeFood.active && this.punishmentState.fakeFood.position) {
      fakeFoods.push(this.punishmentState.fakeFood.position);
    }

    // At Level 3, add multiple fake foods
    if (this.punishmentState.corruptionLevel >= CorruptionLevel.HOSTILE_TAKEOVER) {
      // Add up to 2 additional fake foods at random positions
      for (let i = 0; i < 2 && Math.random() < 0.3; i++) {
        fakeFoods.push({
          x: Math.floor(Math.random() * 20),
          y: Math.floor(Math.random() * 20)
        });
      }
    }

    return fakeFoods;
  }

  // Called when real food is eaten
  onRealFoodEaten(): void {
    this.lastFoodEaten = Date.now();
    this.punishmentState.foodEatenSinceLastBlock++;
  }

  // Check if fake food should be visible (flicker effect)
  shouldShowFakeFood(): boolean {
    return this.punishmentState.fakeFood.active && 
           (this.punishmentState.corruptionLevel < CorruptionLevel.ACTIVE_MANIPULATION || 
            this.punishmentState.fakeFood.flickerState);
  }

  // Generate biased food position based on active punishments
  generateBiasedFoodPosition(
    snake: { x: number; y: number }[],
    gridWidth: number,
    gridHeight: number,
    normalPosition: { x: number; y: number }
  ): { x: number; y: number } {
    let biasedPosition = { ...normalPosition };
    
    // Apply wall bias
    if (this.punishmentState.foodBias.wallBias > 0) {
      if (Math.random() < this.punishmentState.foodBias.wallBias) {
        biasedPosition = this.generateWallAdjacentPosition(snake, gridWidth, gridHeight);
      }
    }
    
    // Apply body bias
    if (this.punishmentState.foodBias.bodyBias > 0) {
      if (Math.random() < this.punishmentState.foodBias.bodyBias) {
        biasedPosition = this.generateBodyAdjacentPosition(snake, gridWidth, gridHeight);
      }
    }
    
    // Apply path prediction bias
    if (this.punishmentState.pathPrediction.active && this.punishmentState.pathPrediction.predictedPath.length > 0) {
      if (Math.random() < this.punishmentState.pathPrediction.biasStrength) {
        const targetPath = this.punishmentState.pathPrediction.predictedPath[
          Math.floor(Math.random() * this.punishmentState.pathPrediction.predictedPath.length)
        ];
        
        // Find valid position near predicted path
        biasedPosition = this.findValidPositionNear(targetPath, snake, gridWidth, gridHeight);
      }
    }
    
    return biasedPosition;
  }

  private generateWallAdjacentPosition(
    snake: { x: number; y: number }[],
    gridWidth: number,
    gridHeight: number
  ): { x: number; y: number } {
    const wallPositions: { x: number; y: number }[] = [];
    
    // Generate positions adjacent to walls
    for (let x = 0; x < gridWidth; x++) {
      for (let y = 0; y < gridHeight; y++) {
        const isWallAdjacent = x === 0 || x === gridWidth - 1 || y === 0 || y === gridHeight - 1 ||
                              x === 1 || x === gridWidth - 2 || y === 1 || y === gridHeight - 2;
        
        if (isWallAdjacent && !snake.some(segment => segment.x === x && segment.y === y)) {
          wallPositions.push({ x, y });
        }
      }
    }
    
    return wallPositions.length > 0 
      ? wallPositions[Math.floor(Math.random() * wallPositions.length)]
      : { x: Math.floor(Math.random() * gridWidth), y: Math.floor(Math.random() * gridHeight) };
  }

  private generateBodyAdjacentPosition(
    snake: { x: number; y: number }[],
    gridWidth: number,
    gridHeight: number
  ): { x: number; y: number } {
    const bodyAdjacentPositions: { x: number; y: number }[] = [];
    
    // Find positions adjacent to snake body (not head)
    for (let i = 1; i < snake.length; i++) {
      const segment = snake[i];
      const adjacent = [
        { x: segment.x + 1, y: segment.y },
        { x: segment.x - 1, y: segment.y },
        { x: segment.x, y: segment.y + 1 },
        { x: segment.x, y: segment.y - 1 }
      ];
      
      for (const pos of adjacent) {
        if (pos.x >= 0 && pos.x < gridWidth && pos.y >= 0 && pos.y < gridHeight &&
            !snake.some(segment => segment.x === pos.x && segment.y === pos.y)) {
          bodyAdjacentPositions.push(pos);
        }
      }
    }
    
    return bodyAdjacentPositions.length > 0
      ? bodyAdjacentPositions[Math.floor(Math.random() * bodyAdjacentPositions.length)]
      : { x: Math.floor(Math.random() * gridWidth), y: Math.floor(Math.random() * gridHeight) };
  }

  private findValidPositionNear(
    target: { x: number; y: number },
    snake: { x: number; y: number }[],
    gridWidth: number,
    gridHeight: number
  ): { x: number; y: number } {
    // Try positions in expanding radius around target
    for (let radius = 0; radius <= 3; radius++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          const pos = { x: target.x + dx, y: target.y + dy };
          
          if (pos.x >= 0 && pos.x < gridWidth && pos.y >= 0 && pos.y < gridHeight &&
              !snake.some(segment => segment.x === pos.x && segment.y === pos.y)) {
            return pos;
          }
        }
      }
    }
    
    // Fallback to random position
    return { x: Math.floor(Math.random() * gridWidth), y: Math.floor(Math.random() * gridHeight) };
  }

  private getCurrentState() {
    return {
      shouldSpawnFakeFood: this.punishmentState.fakeFood.active,
      newSpeedMultiplier: this.punishmentState.speedMultiplier,
      foodSpawnBias: this.punishmentState.foodBias,
      punishmentTriggered: null
    };
  }

  // Reset corruption on game restart (speed resets ONLY on death)
  reset(): void {
    this.punishmentState = {
      corruptionLevel: CorruptionLevel.OBSERVATION,
      corruptionStartTime: 0,
      fakeFood: {
        active: false,
        position: null,
        triggerReason: '',
        flickerState: false,
        lastFlicker: 0
      },
      environmentalBlocks: [],
      lastBlockSpawn: 0,
      foodEatenSinceLastBlock: 0,
      speedMultiplier: 1.0, // Speed resets on death
      speedSurgeActive: false,
      speedFluctuationActive: false,
      foodBias: {
        wallBias: 0,
        bodyBias: 0,
        safeSpaceReduction: 0
      },
      pathPrediction: {
        active: false,
        predictedPath: [],
        biasStrength: 0
      },
      environmentalEffects: {
        colorShift: 0,
        gridTension: false,
        foodPulseRate: 1.0
      }
    };
    this.activePunishments.clear();
    this.lastCommentaryTime = 0;
    this.gameStartTime = 0;
    this.lastFoodEaten = 0;
    this.speedEscalationTimer = 0;
    this.lastSpeedIncrease = 0;
  }

  // Get current punishment state for UI feedback
  getPunishmentState(): PunishmentState {
    return { ...this.punishmentState };
  }

  // Get current corruption level for external systems
  getCorruptionLevel(): CorruptionLevel {
    return this.punishmentState.corruptionLevel;
  }

  // Get environmental effects for renderer
  getEnvironmentalEffects() {
    return this.punishmentState.environmentalEffects;
  }

  // Get environmental blocks
  getEnvironmentalBlocks(): { x: number; y: number }[] {
    return [...this.punishmentState.environmentalBlocks];
  }
}