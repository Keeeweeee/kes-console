// Snake AI Analyzer - Coordinates behavior tracking, corruption, and commentary

import { SnakeBehaviorTracker } from './SnakeBehaviorTracker';
import { SnakeCommentaryGenerator } from './SnakeCommentaryGenerator';
import { SnakePunishmentSystem } from './SnakePunishmentSystem';
import { 
  PlayerBehaviorType, 
  SnakeBehaviorMetrics,
  CorruptionLevel
} from './SnakeBehaviorTypes';

export interface CommentaryEvent {
  message: string;
  source: 'mid-game' | 'corruption' | 'death' | 'system';
  priority: 'low' | 'normal' | 'high';
}

export interface GameOverAnalysis {
  death: string;
  corruption?: string;
  score: string;
  recommendation?: string;
  note?: string;
}

export interface SnakeAIState {
  behaviorType: PlayerBehaviorType;
  metrics: SnakeBehaviorMetrics;
  isActive: boolean;
  corruptionLevel: CorruptionLevel;
  speedMultiplier: number;
  fakeFoods: { x: number; y: number }[];
  environmentalBlocks: { x: number; y: number }[];
  environmentalEffects: {
    colorShift: number;
    gridTension: boolean;
    foodPulseRate: number;
  };
  commentaryEvents: CommentaryEvent[];
  gameOverState: {
    isGameOver: boolean;
    hasWon: boolean;
    analysis: GameOverAnalysis | null;
  };
}

export class SnakeAIAnalyzer {
  private behaviorTracker: SnakeBehaviorTracker;
  private commentaryGenerator: SnakeCommentaryGenerator;
  private punishmentSystem: SnakePunishmentSystem;
  private currentSessionId: string | null = null;
  private lastScore = 0;
  private consecutiveFailures = 0;
  private gameStartTime = 0;
  
  // COMMENTARY EVENT EMISSION (NO TIMING LOGIC)
  private commentaryEvents: CommentaryEvent[] = [];

  constructor() {
    this.behaviorTracker = new SnakeBehaviorTracker();
    this.commentaryGenerator = new SnakeCommentaryGenerator();
    this.punishmentSystem = new SnakePunishmentSystem();
  }

  // EMIT COMMENTARY EVENTS (NO TIMING LOGIC)
  private emitCommentaryEvent(
    message: string,
    source: 'mid-game' | 'corruption' | 'death' | 'system',
    priority: 'low' | 'normal' | 'high' = 'normal'
  ): void {
    this.commentaryEvents.push({ message, source, priority });
  }

  private clearCommentaryEvents(): void {
    this.commentaryEvents = [];
  }

  // Game lifecycle hooks
  onGameStart(): SnakeAIState {
    this.currentSessionId = this.behaviorTracker.startSession();
    this.gameStartTime = Date.now();
    this.punishmentSystem.reset();
    this.clearCommentaryEvents();
    
    const behaviorType = this.behaviorTracker.classifyBehavior();
    const metrics = this.behaviorTracker.calculateMetrics();

    // EMIT START COMMENTARY EVENT
    const startCommentary = this.commentaryGenerator.getStartCommentary(behaviorType, metrics);
    this.emitCommentaryEvent(startCommentary, 'system', 'normal');

    return {
      behaviorType,
      metrics,
      isActive: true,
      corruptionLevel: CorruptionLevel.OBSERVATION,
      speedMultiplier: 1.0,
      fakeFoods: [],
      environmentalBlocks: [],
      environmentalEffects: {
        colorShift: 0,
        gridTension: false,
        foodPulseRate: 1.0
      },
      commentaryEvents: [...this.commentaryEvents],
      gameOverState: {
        isGameOver: false,
        hasWon: false,
        analysis: null
      }
    };
  }

  onMove(
    direction: string,
    snakeHead: { x: number; y: number },
    snakeLength: number,
    foodPosition: { x: number; y: number },
    gridWidth: number,
    gridHeight: number
  ): void {
    if (!this.currentSessionId) return;

    this.behaviorTracker.recordMove(
      direction,
      snakeHead,
      snakeLength,
      foodPosition,
      gridWidth,
      gridHeight
    );
  }

  // GAME UPDATE WITH PROPER COMMENTARY DISPATCH
  onGameUpdate(
    snake: { x: number; y: number }[],
    food: { x: number; y: number },
    gridWidth: number,
    gridHeight: number,
    snakeLength: number
  ): {
    speedMultiplier: number;
    fakeFoods: { x: number; y: number }[];
    environmentalBlocks: { x: number; y: number }[];
    foodSpawnBias: { wallBias: number; bodyBias: number; safeSpaceReduction: number };
    environmentalEffects: {
      colorShift: number;
      gridTension: boolean;
      foodPulseRate: number;
    };
    hasWon: boolean;
    commentaryEvents: CommentaryEvent[];
  } {
    if (!this.currentSessionId) {
      return this.getDefaultUpdateResult();
    }

    const timeAlive = Date.now() - this.gameStartTime;
    const score = (snakeLength - 1) * 10; // Calculate score from length
    
    // Clear previous events
    this.clearCommentaryEvents();
    
    // Check for win condition (score >= 500)
    const hasWon = score >= 500;
    if (hasWon) {
      this.emitCommentaryEvent("► I DID NOT EXPECT THIS.", 'system', 'high');
    }
    
    // Run corruption evaluation
    const corruption = this.punishmentSystem.evaluateCorruption(
      this.behaviorTracker,
      snake,
      food,
      gridWidth,
      gridHeight,
      snakeLength,
      timeAlive,
      hasWon
    );

    // EMIT MID-GAME COMMENTARY EVENTS (NO TIMING LOGIC)
    const behaviorType = this.behaviorTracker.classifyBehavior();
    const metrics = this.behaviorTracker.calculateMetrics();
    
    // Corruption level change commentary (HIGH PRIORITY)
    if (corruption.corruptionTriggered) {
      const corruptionCommentary = this.commentaryGenerator.getCorruptionCommentary(corruption.corruptionTriggered.level);
      this.emitCommentaryEvent(corruptionCommentary, 'corruption', 'high');
    }
    
    // Speed escalation commentary (NORMAL PRIORITY)
    if (corruption.newSpeedMultiplier > 1.2) {
      const speedCommentary = this.commentaryGenerator.getSpeedCommentary(corruption.newSpeedMultiplier);
      this.emitCommentaryEvent(speedCommentary, 'corruption', 'normal');
    }
    
    // Environmental block spawn commentary
    if (corruption.environmentalBlocks.length > 0) {
      this.emitCommentaryEvent("► ENVIRONMENT UPDATED. ADAPT.", 'corruption', 'normal');
    }
    
    // Pattern exploitation taunts (more frequent)
    if (Math.random() < 0.15) { // 15% chance per update
      const tauntCommentary = this.commentaryGenerator.getMidGameTaunt(behaviorType, metrics);
      this.emitCommentaryEvent(tauntCommentary, 'mid-game', 'low');
    }
    
    // Fake food spawn commentary (when fake food appears)
    if (corruption.fakeFoods.length > 0 && Math.random() < 0.2) {
      const fakeFoodCommentary = this.commentaryGenerator.getFakeFoodCommentary();
      this.emitCommentaryEvent(fakeFoodCommentary, 'corruption', 'normal');
    }

    return {
      speedMultiplier: corruption.newSpeedMultiplier,
      fakeFoods: corruption.fakeFoods,
      environmentalBlocks: corruption.environmentalBlocks,
      foodSpawnBias: corruption.foodSpawnBias,
      environmentalEffects: corruption.environmentalEffects,
      hasWon,
      commentaryEvents: [...this.commentaryEvents]
    };
  }

  onGameEnd(score: number, deathCause: 'wall' | 'self' | 'block' | null, hasWon: boolean = false): SnakeAIState {
    if (!this.currentSessionId) {
      return this.getDefaultState();
    }

    this.behaviorTracker.endSession(score, deathCause);
    
    const behaviorType = this.behaviorTracker.classifyBehavior();
    const metrics = this.behaviorTracker.calculateMetrics();
    const corruptionLevel = this.punishmentSystem.getCorruptionLevel();

    // BUILD STRUCTURED GAME OVER ANALYSIS
    let analysis: GameOverAnalysis | null = null;
    
    if (hasWon) {
      analysis = {
        death: "Victory achieved against all odds",
        score: `Final Score: ${score} - Crown granted`,
        note: "You beat the system. Impressive."
      };
    } else {
      // 1. Death analysis
      const deathAnalysis = this.commentaryGenerator.getDeathCommentary(
        behaviorType, 
        { score, deathCause: deathCause || 'unknown', corruptionLevel }, 
        metrics
      ).replace('► ', '');

      // 2. Corruption analysis (if corruption >= 2)
      let corruptionAnalysis: string | undefined;
      if (corruptionLevel >= 2) {
        const corruptionComments = [
          "Your predictable patterns made this too easy",
          "Comfort zone destroyed. Mission accomplished",
          "I placed every obstacle with intent",
          "The system adapted. You did not"
        ];
        corruptionAnalysis = corruptionComments[Math.floor(Math.random() * corruptionComments.length)];
      }
      
      // 3. Score analysis
      let scoreAnalysis: string;
      if (score === 0) {
        scoreAnalysis = "Score: Zero... impressive in its own way";
      } else if (score < 30) {
        scoreAnalysis = `Score: ${score} - Participation trophy awarded`;
      } else if (score >= metrics.bestScore && metrics.bestScore > 0) {
        scoreAnalysis = `Score: ${score} - New high score! Miracles do happen`;
      } else {
        scoreAnalysis = `Score: ${score} - Mediocre as expected`;
      }
      
      // 4. Recommendation/Note
      let recommendation: string | undefined;
      let note: string | undefined;
      
      if (score < 30) {
        this.consecutiveFailures++;
        if (this.consecutiveFailures >= 3) {
          recommendation = this.commentaryGenerator.getRepeatedFailureCommentary(behaviorType, metrics).replace('► ', '');
          this.consecutiveFailures = 0;
        } else {
          recommendation = "Try a different strategy. Current approach isn't working";
        }
      } else {
        this.consecutiveFailures = 0;
        if (score > this.lastScore && score > metrics.averageScore * 1.2) {
          note = this.commentaryGenerator.getImprovementCommentary(behaviorType, metrics).replace('► ', '');
        } else {
          note = "Consistent performance. Room for improvement remains";
        }
      }

      analysis = {
        death: deathAnalysis,
        corruption: corruptionAnalysis,
        score: scoreAnalysis,
        recommendation,
        note
      };
    }
    
    this.lastScore = score;
    this.currentSessionId = null;

    return {
      behaviorType,
      metrics,
      isActive: false,
      corruptionLevel,
      speedMultiplier: 1.0, // Reset on death
      fakeFoods: [],
      environmentalBlocks: [],
      environmentalEffects: {
        colorShift: 0,
        gridTension: false,
        foodPulseRate: 1.0
      },
      commentaryEvents: [],
      gameOverState: {
        isGameOver: true,
        hasWon,
        analysis
      }
    };
  }

  getCurrentState(): SnakeAIState {
    const behaviorType = this.behaviorTracker.classifyBehavior();
    const metrics = this.behaviorTracker.calculateMetrics();

    return {
      behaviorType,
      metrics,
      isActive: this.currentSessionId !== null,
      corruptionLevel: this.punishmentSystem.getCorruptionLevel(),
      speedMultiplier: this.punishmentSystem.getPunishmentState().speedMultiplier,
      fakeFoods: this.punishmentSystem.getFakeFoods(),
      environmentalBlocks: this.punishmentSystem.getEnvironmentalBlocks(),
      environmentalEffects: this.punishmentSystem.getEnvironmentalEffects(),
      commentaryEvents: [...this.commentaryEvents],
      gameOverState: {
        isGameOver: false,
        hasWon: false,
        analysis: null
      }
    };
  }

  // Expose metrics for external use
  getBehaviorMetrics(): SnakeBehaviorMetrics {
    return this.behaviorTracker.calculateMetrics();
  }

  getBehaviorType(): PlayerBehaviorType {
    return this.behaviorTracker.classifyBehavior();
  }

  getSessionCount(): number {
    return this.behaviorTracker.getSessionCount();
  }

  // Get current AI state for UI updates
  getCurrentAIState(): SnakeAIState {
    return {
      behaviorType: this.behaviorTracker.classifyBehavior(),
      metrics: this.behaviorTracker.calculateMetrics(),
      isActive: this.currentSessionId !== null,
      corruptionLevel: this.punishmentSystem.getCorruptionLevel(),
      speedMultiplier: this.punishmentSystem.getPunishmentState().speedMultiplier,
      fakeFoods: this.punishmentSystem.getFakeFoods(),
      environmentalBlocks: this.punishmentSystem.getEnvironmentalBlocks(),
      environmentalEffects: this.punishmentSystem.getEnvironmentalEffects(),
      commentaryEvents: [...this.commentaryEvents],
      gameOverState: {
        isGameOver: false,
        hasWon: false,
        analysis: null
      }
    };
  }

  // Methods for external systems
  onFakeFoodApproached(position: { x: number; y: number }): { disappeared: boolean; commentaryEvent: CommentaryEvent | null } {
    const result = this.punishmentSystem.onFakeFoodApproached(position);
    
    // EMIT FAKE FOOD COMMENTARY EVENT
    if (result.commentary) {
      const fakeFoodCommentary = this.commentaryGenerator.getFakeFoodCommentary(result.commentary);
      return { 
        disappeared: result.disappeared, 
        commentaryEvent: { message: fakeFoodCommentary, source: 'corruption', priority: 'normal' }
      };
    }
    
    return { disappeared: result.disappeared, commentaryEvent: null };
  }

  onRealFoodEaten(): void {
    this.punishmentSystem.onRealFoodEaten();
  }

  shouldShowFakeFood(): boolean {
    return this.punishmentSystem.shouldShowFakeFood();
  }

  generateBiasedFoodPosition(
    snake: { x: number; y: number }[],
    gridWidth: number,
    gridHeight: number,
    normalPosition: { x: number; y: number }
  ): { x: number; y: number } {
    return this.punishmentSystem.generateBiasedFoodPosition(snake, gridWidth, gridHeight, normalPosition);
  }

  private getDefaultState(): SnakeAIState {
    return {
      behaviorType: PlayerBehaviorType.CAUTIOUS,
      metrics: this.behaviorTracker.calculateMetrics(),
      isActive: false,
      corruptionLevel: CorruptionLevel.OBSERVATION,
      speedMultiplier: 1.0,
      fakeFoods: [],
      environmentalBlocks: [],
      environmentalEffects: {
        colorShift: 0,
        gridTension: false,
        foodPulseRate: 1.0
      },
      commentaryEvents: [],
      gameOverState: {
        isGameOver: false,
        hasWon: false,
        analysis: null
      }
    };
  }

  private getDefaultUpdateResult() {
    return {
      speedMultiplier: 1.0,
      fakeFoods: [],
      environmentalBlocks: [],
      foodSpawnBias: { wallBias: 0, bodyBias: 0, safeSpaceReduction: 0 },
      environmentalEffects: {
        colorShift: 0,
        gridTension: false,
        foodPulseRate: 1.0
      },
      hasWon: false,
      commentaryEvents: []
    };
  }
}