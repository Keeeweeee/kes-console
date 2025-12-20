// Minesweeper AI Analyzer - Coordinates deceptive behavior analysis

import { MinesweeperBehaviorTracker } from './MinesweeperBehaviorTracker';
import { MinesweeperCommentaryGenerator } from './MinesweeperCommentaryGenerator';
import {
  MinesweeperCommentaryTrigger,
  MinesweeperCommentaryContext,
  MinesweeperBehaviorMetrics,
  TileAdvice
} from './MinesweeperBehaviorTypes';

export interface MinesweeperAIState {
  commentary: string;
  currentAdvice: TileAdvice | null;
  trustLevel: number;
  deceptionCount: number;
  isActive: boolean;
  metrics: MinesweeperBehaviorMetrics;
}

export class MinesweeperAIAnalyzer {
  private behaviorTracker: MinesweeperBehaviorTracker;
  private commentaryGenerator: MinesweeperCommentaryGenerator;
  private currentSessionId: string | null = null;

  constructor() {
    this.behaviorTracker = new MinesweeperBehaviorTracker();
    this.commentaryGenerator = new MinesweeperCommentaryGenerator();
  }

  // Game lifecycle hooks
  onGameStart(): MinesweeperAIState {
    this.currentSessionId = this.behaviorTracker.startSession();
    const metrics = this.behaviorTracker.calculateMetrics();

    const context: MinesweeperCommentaryContext = {
      trigger: MinesweeperCommentaryTrigger.GAME_START
    };

    const commentary = this.commentaryGenerator.generateCommentary(context, metrics);

    return {
      commentary,
      currentAdvice: null,
      trustLevel: this.behaviorTracker.getCurrentTrustLevel(),
      deceptionCount: this.behaviorTracker.getDeceptionCount(),
      isActive: true,
      metrics
    };
  }

  onTileHover(
    row: number,
    col: number,
    calculateProbability: (row: number, col: number) => number
  ): MinesweeperAIState {
    const realProbability = calculateProbability(row, col);
    const trustLevel = this.behaviorTracker.getCurrentTrustLevel();
    const metrics = this.behaviorTracker.calculateMetrics();

    // Generate advice (potentially deceptive)
    const advice = this.commentaryGenerator.generateTileAdvice(
      row,
      col,
      realProbability,
      trustLevel,
      metrics
    );

    // Record advice with explicit coordinates
    this.behaviorTracker.recordAdviceGiven(advice);

    const context: MinesweeperCommentaryContext = {
      trigger: MinesweeperCommentaryTrigger.TILE_HOVER,
      tilePosition: { row, col },
      probability: realProbability
    };

    const commentary = this.commentaryGenerator.generateCommentary(context, metrics, advice);

    return {
      commentary,
      currentAdvice: advice,
      trustLevel,
      deceptionCount: this.behaviorTracker.getDeceptionCount(),
      isActive: true,
      metrics
    };
  }

  onTileClick(
    row: number,
    col: number,
    action: 'click' | 'flag',
    result: 'safe' | 'mine' | 'flag_correct' | 'flag_incorrect'
  ): MinesweeperAIState {
    if (!this.currentSessionId) {
      return this.getDefaultState();
    }

    // Get the last advice before recording the move
    const lastAdvice = this.behaviorTracker.getLastAdvice();
    
    // Record move and get evaluation results
    const { followedAdvice, ignoredAdvice } = this.behaviorTracker.recordMove(row, col, action, result);
    const metrics = this.behaviorTracker.calculateMetrics();
    
    let commentary = '';
    let trigger: MinesweeperCommentaryTrigger;

    // Determine commentary based on exact coordinate matching
    if (followedAdvice) {
      trigger = MinesweeperCommentaryTrigger.ADVICE_FOLLOWED;
      
      // Check if deception was successful (player followed deceptive advice and hit mine)
      if (result === 'mine' && lastAdvice?.isDeceptive) {
        trigger = MinesweeperCommentaryTrigger.DECEPTION_SUCCESS;
      }
    } else if (ignoredAdvice) {
      trigger = MinesweeperCommentaryTrigger.ADVICE_IGNORED;
    } else {
      // No advice was given for this tile, use a neutral response
      return {
        commentary: this.commentaryGenerator.getCurrentCommentary(),
        currentAdvice: null,
        trustLevel: this.behaviorTracker.getCurrentTrustLevel(),
        deceptionCount: this.behaviorTracker.getDeceptionCount(),
        isActive: true,
        metrics
      };
    }

    const context: MinesweeperCommentaryContext = {
      trigger,
      tilePosition: { row, col }
    };

    commentary = this.commentaryGenerator.generateCommentary(context, metrics, lastAdvice || undefined);

    // Check for rage quit
    if (this.behaviorTracker.hasRageQuit()) {
      const rageContext: MinesweeperCommentaryContext = {
        trigger: MinesweeperCommentaryTrigger.RAGE_QUIT
      };
      commentary = this.commentaryGenerator.generateCommentary(rageContext, metrics);
    }

    return {
      commentary,
      currentAdvice: null,
      trustLevel: this.behaviorTracker.getCurrentTrustLevel(),
      deceptionCount: this.behaviorTracker.getDeceptionCount(),
      isActive: true,
      metrics
    };
  }

  onGameEnd(gameResult: 'won' | 'lost' | 'abandoned'): MinesweeperAIState {
    if (!this.currentSessionId) {
      return this.getDefaultState();
    }

    // Get loss context before ending session
    const lossContext = this.behaviorTracker.getLossContext();
    
    this.behaviorTracker.endSession(gameResult);
    const metrics = this.behaviorTracker.calculateMetrics();

    const context: MinesweeperCommentaryContext = {
      trigger: MinesweeperCommentaryTrigger.GAME_END,
      gameResult: gameResult as 'won' | 'lost' | 'abandoned',
      lossContext: lossContext || undefined
    };

    const commentary = this.commentaryGenerator.generateCommentary(context, metrics);
    this.currentSessionId = null;

    return {
      commentary,
      currentAdvice: null,
      trustLevel: this.behaviorTracker.getCurrentTrustLevel(),
      deceptionCount: this.behaviorTracker.getDeceptionCount(),
      isActive: false,
      metrics
    };
  }

  getCurrentState(): MinesweeperAIState {
    const metrics = this.behaviorTracker.calculateMetrics();
    const commentary = this.commentaryGenerator.getCurrentCommentary();

    return {
      commentary,
      currentAdvice: null,
      trustLevel: this.behaviorTracker.getCurrentTrustLevel(),
      deceptionCount: this.behaviorTracker.getDeceptionCount(),
      isActive: this.currentSessionId !== null,
      metrics
    };
  }

  // Expose metrics for external use
  getBehaviorMetrics(): MinesweeperBehaviorMetrics {
    return this.behaviorTracker.calculateMetrics();
  }

  getTrustLevel(): number {
    return this.behaviorTracker.getCurrentTrustLevel();
  }

  getDeceptionCount(): number {
    return this.behaviorTracker.getDeceptionCount();
  }

  getSessionCount(): number {
    return this.behaviorTracker.getSessionCount();
  }

  private getDefaultState(): MinesweeperAIState {
    return {
      commentary: "► MINESWEEPER AI READY",
      currentAdvice: null,
      trustLevel: 0.5,
      deceptionCount: 0,
      isActive: false,
      metrics: this.behaviorTracker.calculateMetrics()
    };
  }
}