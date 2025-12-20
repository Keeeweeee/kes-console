// Pac-Man AI Analyzer - Coordinates ghost personalities and commentary

import { GhostPersonalityAI } from './GhostPersonalityAI';
import { PacManCommentaryGenerator } from './PacManCommentaryGenerator';
import {
  PacManCommentaryTrigger,
  PacManCommentaryContext,
  PacManBehaviorMetrics,
  GhostPersonalityState,
  GhostInteraction
} from './PacManAITypes';
import { PacManGameData, Direction } from '../../games/pacman/PacManGame';

export interface PacManAIState {
  commentary: string;
  ghostPersonalities: GhostPersonalityState[];
  playerBehavior: 'aggressive' | 'defensive' | 'greedy' | 'cautious';
  isActive: boolean;
  metrics: PacManBehaviorMetrics;
}

export class PacManAIAnalyzer {
  private ghostAI: GhostPersonalityAI;
  private commentaryGenerator: PacManCommentaryGenerator;
  private currentSessionId: string | null = null;
  private interactions: GhostInteraction[] = [];
  private lastGameData: PacManGameData | null = null;
  private moveCount = 0;

  constructor() {
    this.ghostAI = new GhostPersonalityAI();
    this.commentaryGenerator = new PacManCommentaryGenerator();
  }

  // Game lifecycle hooks
  onGameStart(gameData: PacManGameData): PacManAIState {
    this.currentSessionId = `pacman_${Date.now()}`;
    this.interactions = [];
    this.moveCount = 0;
    this.lastGameData = null;

    // Initialize ghost personalities
    for (const ghost of gameData.ghosts) {
      this.ghostAI.initializeGhost(ghost);
    }

    const ghostStates = this.ghostAI.getGhostPersonalityStates();
    const metrics = this.calculateMetrics();

    const context: PacManCommentaryContext = {
      trigger: PacManCommentaryTrigger.GAME_START
    };

    const commentary = this.commentaryGenerator.generateCommentary(context, ghostStates, metrics);

    return {
      commentary,
      ghostPersonalities: ghostStates,
      playerBehavior: 'cautious',
      isActive: true,
      metrics
    };
  }

  onGameUpdate(gameData: PacManGameData): { aiState: PacManAIState; ghostMoves: Map<string, Direction>; chainAttempts: Map<string, Direction>; speechTriggers: Map<string, string> } {
    if (!this.currentSessionId) {
      return { aiState: this.getDefaultState(), ghostMoves: new Map(), chainAttempts: new Map(), speechTriggers: new Map() };
    }

    // Update ghost AI and get their moves
    const ghostMoves = this.ghostAI.updateGhostBehavior(gameData);
    
    // Get lookahead chain attempts for ghosts with active segments
    const chainAttempts = this.ghostAI.getChainAttempts();
    
    // Get speech triggers for personality expressions
    const speechTriggers = this.ghostAI.getSpeechTriggers();

    // Analyze player behavior changes
    this.analyzePlayerBehavior(gameData);

    // Check for significant ghost behavior changes
    const ghostStates = this.ghostAI.getGhostPersonalityStates();
    const behaviorChanges = this.detectBehaviorChanges(ghostStates);

    let commentary = this.commentaryGenerator.getCurrentCommentary();
    let trigger: PacManCommentaryTrigger | null = null;

    // Generate commentary for behavior changes
    if (behaviorChanges.length > 0) {
      const change = behaviorChanges[0]; // Focus on first significant change
      trigger = PacManCommentaryTrigger.GHOST_BEHAVIOR_CHANGE;
      
      const context: PacManCommentaryContext = {
        trigger,
        ghostId: change.ghostId,
        behaviorDescription: change.currentBehavior
      };

      commentary = this.commentaryGenerator.generateCommentary(context, ghostStates, this.calculateMetrics());
    }

    // Check for power pellet activation
    if (this.lastGameData && !this.lastGameData.powerPelletActive && gameData.powerPelletActive) {
      trigger = PacManCommentaryTrigger.POWER_PELLET_ACTIVATED;
      
      const context: PacManCommentaryContext = { trigger };
      commentary = this.commentaryGenerator.generateCommentary(context, ghostStates, this.calculateMetrics());
    }

    // Check for ghost eaten
    if (this.lastGameData) {
      for (const ghost of gameData.ghosts) {
        const lastGhost = this.lastGameData.ghosts.find(g => g.id === ghost.id);
        if (lastGhost && !lastGhost.isEaten && ghost.isEaten) {
          trigger = PacManCommentaryTrigger.GHOST_EATEN;
          
          const context: PacManCommentaryContext = {
            trigger,
            ghostId: ghost.id
          };
          
          commentary = this.commentaryGenerator.generateCommentary(context, ghostStates, this.calculateMetrics());
          break;
        }
      }
    }

    this.lastGameData = { ...gameData };

    return {
      aiState: {
        commentary,
        ghostPersonalities: ghostStates,
        playerBehavior: this.analyzeCurrentPlayerBehavior(gameData),
        isActive: true,
        metrics: this.calculateMetrics()
      },
      ghostMoves,
      chainAttempts,
      speechTriggers
    };
  }

  onPacManDeath(gameData: PacManGameData, killerGhostId: string): PacManAIState {
    if (!this.currentSessionId) {
      return this.getDefaultState();
    }

    const ghostStates = this.ghostAI.getGhostPersonalityStates();
    const metrics = this.calculateMetrics();

    // Generate sassy, ghost-aware death commentary
    const deathCommentary = this.generateDeathCommentary(killerGhostId);

    return {
      commentary: deathCommentary,
      ghostPersonalities: ghostStates,
      playerBehavior: this.analyzeCurrentPlayerBehavior(gameData),
      isActive: true,
      metrics
    };
  }

  private generateDeathCommentary(killerGhostId: string): string {
    const ghostPersonality = killerGhostId;
    
    switch (ghostPersonality) {
      case 'mimic': // Lost ghost
        const lostMessages = [
          "You died to the one who doesn't even know what it's doing.",
          "That ghost was lost. Somehow… you were more lost.",
          "Imagine losing to pure confusion."
        ];
        return lostMessages[Math.floor(Math.random() * lostMessages.length)];
        
      case 'loner': // Scared ghost
        const lonerMessages = [
          "The scaredy cat scared the other scaredy cat. Poetic.",
          "You ran into the one that runs away. Impressive timing.",
          "Fear met fear. You blinked first."
        ];
        return lonerMessages[Math.floor(Math.random() * lonerMessages.length)];
        
      case 'bully': // Aggressive ghost
        const bullyMessages = [
          "That was brutal.",
          "The bully claims another victim.",
          "You got steamrolled. Classic."
        ];
        return bullyMessages[Math.floor(Math.random() * bullyMessages.length)];
        
      case 'strategist': // Predictive ghost
        const strategistMessages = [
          "I don't even blame you for that one.",
          "That was calculated. Painfully so.",
          "You didn't lose. You were outplayed."
        ];
        return strategistMessages[Math.floor(Math.random() * strategistMessages.length)];
        
      default:
        return "Surrounded. No dignity left to recover.";
    }
  }

  onGameEnd(gameData: PacManGameData, result: 'won' | 'lost'): PacManAIState {
    if (!this.currentSessionId) {
      return this.getDefaultState();
    }

    const ghostStates = this.ghostAI.getGhostPersonalityStates();
    const metrics = this.calculateMetrics();

    const context: PacManCommentaryContext = {
      trigger: PacManCommentaryTrigger.GAME_END,
      playerBehavior: this.analyzeCurrentPlayerBehavior(gameData)
    };

    const commentary = this.commentaryGenerator.generateCommentary(context, ghostStates, metrics);
    this.currentSessionId = null;

    return {
      commentary,
      ghostPersonalities: ghostStates,
      playerBehavior: this.analyzeCurrentPlayerBehavior(gameData),
      isActive: false,
      metrics
    };
  }

  getCurrentState(): PacManAIState {
    const ghostStates = this.ghostAI.getGhostPersonalityStates();
    const commentary = this.commentaryGenerator.getCurrentCommentary();

    return {
      commentary,
      ghostPersonalities: ghostStates,
      playerBehavior: 'cautious',
      isActive: this.currentSessionId !== null,
      metrics: this.calculateMetrics()
    };
  }

  // Private analysis methods
  private analyzePlayerBehavior(gameData: PacManGameData): void {
    if (!this.lastGameData) return;

    this.moveCount++;

    // Record interactions with ghosts
    for (const ghost of gameData.ghosts) {
      const distance = this.getDistance(gameData.pacman.position, ghost.position);
      
      if (distance <= 3) { // Close interaction
        this.interactions.push({
          timestamp: Date.now(),
          ghostId: ghost.id,
          interactionType: this.determineInteractionType(gameData, ghost, distance),
          pacmanPosition: { ...gameData.pacman.position },
          ghostPosition: { ...ghost.position },
          distance,
          powerPelletActive: gameData.powerPelletActive
        });
      }
    }
  }

  private determineInteractionType(
    gameData: PacManGameData, 
    ghost: any, 
    distance: number
  ): 'chase' | 'flee' | 'ambush' | 'avoid' | 'eaten' {
    if (ghost.isEaten) return 'eaten';
    
    if (gameData.powerPelletActive) {
      return distance < 2 ? 'chase' : 'chase';
    } else {
      return distance < 2 ? 'flee' : 'avoid';
    }
  }

  private analyzeCurrentPlayerBehavior(gameData: PacManGameData): 'aggressive' | 'defensive' | 'greedy' | 'cautious' {
    const metrics = this.calculateMetrics();
    
    if (metrics.aggressiveMovesTowardGhosts > metrics.defensiveMovesAwayFromGhosts * 2) {
      return 'aggressive';
    } else if (metrics.defensiveMovesAwayFromGhosts > metrics.aggressiveMovesTowardGhosts * 2) {
      return 'defensive';
    } else if (metrics.pelletGreedLevel > 0.7) {
      return 'greedy';
    } else {
      return 'cautious';
    }
  }

  private detectBehaviorChanges(currentStates: GhostPersonalityState[]): GhostPersonalityState[] {
    // Return states that have changed behavior significantly
    return currentStates.filter(state => 
      state.currentBehavior !== 'patrolling' && 
      state.currentBehavior !== 'seeking' &&
      !state.lastDecision.includes('initialized')
    );
  }

  private calculateMetrics(): PacManBehaviorMetrics {
    const aggressiveInteractions = this.interactions.filter(i => 
      i.interactionType === 'chase' || (i.interactionType === 'ambush' && i.powerPelletActive)
    ).length;

    const defensiveInteractions = this.interactions.filter(i => 
      i.interactionType === 'flee' || i.interactionType === 'avoid'
    ).length;

    const ghostsEaten = this.interactions.filter(i => i.interactionType === 'eaten').length;

    const deathsByGhost: Record<string, number> = {};
    this.interactions.forEach(i => {
      if (i.interactionType === 'flee' && i.distance < 1) {
        deathsByGhost[i.ghostId] = (deathsByGhost[i.ghostId] || 0) + 1;
      }
    });

    const totalDistance = this.interactions.reduce((sum, i) => sum + i.distance, 0);
    const averageDistance = this.interactions.length > 0 ? totalDistance / this.interactions.length : 0;

    return {
      totalMoves: this.moveCount,
      aggressiveMovesTowardGhosts: aggressiveInteractions,
      defensiveMovesAwayFromGhosts: defensiveInteractions,
      pelletGreedLevel: 0.5, // Simplified calculation
      powerPelletUsage: 0.5, // Simplified calculation
      averageDistanceFromGhosts: averageDistance,
      ghostsEaten,
      deathsByGhost
    };
  }

  private getDistance(pos1: any, pos2: any): number {
    return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
  }

  private getDefaultState(): PacManAIState {
    return {
      commentary: "► PAC-MAN AI READY",
      ghostPersonalities: [],
      playerBehavior: 'cautious',
      isActive: false,
      metrics: {
        totalMoves: 0,
        aggressiveMovesTowardGhosts: 0,
        defensiveMovesAwayFromGhosts: 0,
        pelletGreedLevel: 0,
        powerPelletUsage: 0,
        averageDistanceFromGhosts: 0,
        ghostsEaten: 0,
        deathsByGhost: {}
      }
    };
  }
}