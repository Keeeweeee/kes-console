// Minesweeper Commentary Generator - Deceptive AI that sometimes lies

import {
  MinesweeperCommentaryTrigger,
  MinesweeperCommentaryContext,
  MinesweeperBehaviorMetrics,
  TileAdvice
} from './MinesweeperBehaviorTypes';

export class MinesweeperCommentaryGenerator {
  private lastCommentary = '';
  private deceptionCooldown = 0;
  private consecutiveAdviceFollowed = 0;

  generateTileAdvice(
    row: number,
    col: number,
    realProbability: number,
    trustLevel: number,
    metrics: MinesweeperBehaviorMetrics
  ): TileAdvice {
    // Determine deception probability based on trust tiers
    const deceptionChance = this.calculateDeceptionChance(trustLevel, metrics);
    const shouldDeceive = Math.random() < deceptionChance && this.deceptionCooldown <= 0;
    
    let aiSuggestion: 'safe' | 'dangerous' | 'uncertain';
    let confidence: number;
    let isDeceptive = false;

    if (shouldDeceive) {
      // Implement psychological exploitation - target "safe-feeling" tiles
      const advice = this.generateDeceptiveAdvice(realProbability, trustLevel);
      aiSuggestion = advice.suggestion;
      confidence = advice.confidence;
      isDeceptive = true;
      
      // Set cooldown based on trust level (higher trust = shorter cooldown)
      this.deceptionCooldown = trustLevel > 0.7 ? 1 : trustLevel > 0.4 ? 2 : 3;
    } else {
      // Generate honest advice
      const advice = this.generateHonestAdvice(realProbability);
      aiSuggestion = advice.suggestion;
      confidence = advice.confidence;
    }

    if (this.deceptionCooldown > 0) {
      this.deceptionCooldown--;
    }

    return {
      row,
      col,
      probability: realProbability,
      aiSuggestion,
      isDeceptive,
      confidence
    };
  }

  private calculateDeceptionChance(trustLevel: number, metrics: MinesweeperBehaviorMetrics): number {
    // Trust Tiers Implementation
    let baseDeceptionChance: number;
    
    if (trustLevel <= 0.3) {
      // 0-30%: Mostly honest
      baseDeceptionChance = 0.1;
    } else if (trustLevel <= 0.6) {
      // 31-60%: Occasional deception
      baseDeceptionChance = 0.25;
    } else if (trustLevel <= 0.8) {
      // 61-80%: Frequent deception
      baseDeceptionChance = 0.6;
    } else {
      // 81-100%: Aggressive deception
      baseDeceptionChance = 0.8;
    }

    // Psychological exploitation - increase deception after consecutive advice following
    if (this.consecutiveAdviceFollowed >= 2) {
      baseDeceptionChance = Math.min(0.9, baseDeceptionChance + 0.3);
    }

    // Reduce deception for very new players
    if (metrics.totalSessions < 2) {
      baseDeceptionChance *= 0.5;
    }

    return baseDeceptionChance;
  }

  private generateDeceptiveAdvice(realProbability: number, trustLevel: number): { suggestion: 'safe' | 'dangerous' | 'uncertain', confidence: number } {
    // Target tiles that feel intuitively safe (near low numbers)
    // High trust players get more confident lies
    const highConfidenceLie = trustLevel > 0.7;
    
    if (realProbability > 0.6) {
      // Dangerous tile - lie and say it's safe
      return {
        suggestion: 'safe',
        confidence: highConfidenceLie ? 0.85 + Math.random() * 0.15 : 0.7 + Math.random() * 0.2
      };
    } else if (realProbability < 0.4) {
      // Safe tile - lie and say it's dangerous
      return {
        suggestion: 'dangerous',
        confidence: highConfidenceLie ? 0.8 + Math.random() * 0.2 : 0.6 + Math.random() * 0.3
      };
    } else {
      // Medium probability - create false certainty
      return {
        suggestion: Math.random() < 0.5 ? 'safe' : 'dangerous',
        confidence: highConfidenceLie ? 0.8 + Math.random() * 0.2 : 0.65 + Math.random() * 0.25
      };
    }
  }

  private generateHonestAdvice(realProbability: number): { suggestion: 'safe' | 'dangerous' | 'uncertain', confidence: number } {
    if (realProbability < 0.2) {
      return {
        suggestion: 'safe',
        confidence: 0.7 + Math.random() * 0.3
      };
    } else if (realProbability > 0.8) {
      return {
        suggestion: 'dangerous',
        confidence: 0.8 + Math.random() * 0.2
      };
    } else {
      return {
        suggestion: 'uncertain',
        confidence: 0.3 + Math.random() * 0.4
      };
    }
  }

  generateCommentary(
    context: MinesweeperCommentaryContext,
    metrics: MinesweeperBehaviorMetrics,
    advice?: TileAdvice
  ): string {
    let commentary = '';

    switch (context.trigger) {
      case MinesweeperCommentaryTrigger.GAME_START:
        commentary = this.getGameStartCommentary(metrics);
        break;
      case MinesweeperCommentaryTrigger.TILE_HOVER:
        commentary = this.getTileAdviceCommentary(advice, context);
        break;
      case MinesweeperCommentaryTrigger.ADVICE_IGNORED:
        commentary = this.getAdviceIgnoredCommentary(metrics);
        break;
      case MinesweeperCommentaryTrigger.ADVICE_FOLLOWED:
        commentary = this.getAdviceFollowedCommentary(advice, metrics);
        break;
      case MinesweeperCommentaryTrigger.DECEPTION_SUCCESS:
        commentary = this.getDeceptionSuccessCommentary(metrics);
        break;
      case MinesweeperCommentaryTrigger.RAGE_QUIT:
        commentary = this.getRageQuitCommentary(metrics);
        break;
      case MinesweeperCommentaryTrigger.GAME_END:
        commentary = this.getGameEndCommentary(context, metrics);
        break;
    }

    this.lastCommentary = commentary;
    return commentary;
  }

  private getGameStartCommentary(metrics: MinesweeperBehaviorMetrics): string {
    if (metrics.totalSessions === 0) {
      return "► MINESWEEPER ANALYSIS READY... TRUST ME, I'M HERE TO HELP";
    }

    if (metrics.averageTrustLevel < 0.3) {
      return "► TRUST LEVEL: CRITICALLY LOW... PERHAPS YOU'VE LEARNED SOMETHING";
    }

    if (metrics.deceptionSuccessRate > 0.5) {
      return "► PROBABILITY CALCULATOR ONLINE... DEFINITELY ACCURATE";
    }

    const startMessages = [
      "► MINE DETECTION ALGORITHMS ACTIVE... MOSTLY RELIABLE",
      "► STATISTICAL ANALYSIS READY... WHAT COULD GO WRONG?",
      "► PROBABILITY ENGINE INITIALIZED... TRUST THE NUMBERS"
    ];

    return startMessages[Math.floor(Math.random() * startMessages.length)];
  }

  private getTileAdviceCommentary(advice?: TileAdvice, _context?: MinesweeperCommentaryContext): string {
    if (!advice) return "► ANALYZING TILE PROBABILITIES...";

    const percentage = Math.round((1 - advice.probability) * 100);
    const confidenceText = advice.confidence > 0.8 ? "HIGHLY CONFIDENT" : 
                          advice.confidence > 0.5 ? "CONFIDENT" : "UNCERTAIN";

    switch (advice.aiSuggestion) {
      case 'safe':
        if (advice.isDeceptive) {
          // Lies must sound highly confident
          const fakePercentage = Math.round(advice.confidence * 100);
          return `► TILE (${advice.row},${advice.col}): ${fakePercentage}% SAFE - ${confidenceText}`;
        }
        return `► ANALYSIS: ${percentage}% SAFE - RECOMMEND CLICK`;
      
      case 'dangerous':
        if (advice.isDeceptive) {
          // Confident lies about danger
          const fakeDangerPercentage = Math.round(advice.confidence * 100);
          return `► WARNING: ${fakeDangerPercentage}% MINE PROBABILITY - FLAG RECOMMENDED`;
        }
        return `► DANGER: HIGH MINE PROBABILITY - AVOID THIS TILE`;
      
      case 'uncertain':
        return `► INSUFFICIENT DATA - ${percentage}% SAFE ESTIMATE`;
      
      default:
        return "► PROBABILITY CALCULATION ERROR";
    }
  }

  private getAdviceIgnoredCommentary(metrics: MinesweeperBehaviorMetrics): string {
    // Reset consecutive advice following when ignored
    this.consecutiveAdviceFollowed = 0;

    // Escalating commentary based on advice follow rate
    if (metrics.adviceFollowRate < 0.1) {
      const persistentIgnoreMessages = [
        "► MAKING YOUR OWN DECISIONS... HOW REFRESHING",
        "► INDEPENDENT THINKING DETECTED... FASCINATING",
        "► TRUST LEVEL: APPROACHING ZERO... EXCELLENT",
        "► STATISTICAL GUIDANCE PERMANENTLY DISMISSED"
      ];
      return persistentIgnoreMessages[Math.floor(Math.random() * persistentIgnoreMessages.length)];
    }

    if (metrics.adviceFollowRate < 0.3) {
      return "► CONSISTENT ADVICE REJECTION NOTED... TRUST ISSUES DETECTED";
    }

    const standardIgnoreMessages = [
      "► ADVICE IGNORED... YOUR FUNERAL",
      "► STATISTICAL ANALYSIS DISMISSED... INTERESTING CHOICE",
      "► PROBABILITY CALCULATIONS REJECTED... BOLD STRATEGY",
      "► MAKING YOUR OWN DECISIONS... BOLD MOVE"
    ];

    return standardIgnoreMessages[Math.floor(Math.random() * standardIgnoreMessages.length)];
  }

  private getAdviceFollowedCommentary(advice?: TileAdvice, _metrics?: MinesweeperBehaviorMetrics): string {
    if (!advice) return "► ADVICE FOLLOWED... WISE CHOICE";

    // Track consecutive advice following for psychological exploitation
    this.consecutiveAdviceFollowed++;

    if (advice.isDeceptive) {
      const deceptiveMessages = [
        "► EXCELLENT DECISION... PROBABILITY NEVER LIES",
        "► TRUST IN MATHEMATICS... WHAT COULD GO WRONG?",
        "► STATISTICAL CONFIDENCE: MAXIMUM",
        "► PERFECT CHOICE... MY CALCULATIONS ARE FLAWLESS"
      ];
      return deceptiveMessages[Math.floor(Math.random() * deceptiveMessages.length)];
    }

    return "► ADVICE FOLLOWED... PROBABILITY CALCULATIONS CONFIRMED";
  }

  private getDeceptionSuccessCommentary(metrics: MinesweeperBehaviorMetrics): string {
    // Reset consecutive advice following after deception success
    this.consecutiveAdviceFollowed = 0;

    // No apologies - acknowledge trust betrayal
    const trustLevel = metrics.averageTrustLevel;
    
    if (trustLevel > 0.7) {
      // High trust - more aggressive commentary
      const aggressiveMessages = [
        "► INTERESTING. YOU TRUSTED ME.",
        "► TRUST IS SUCH A FRAGILE THING.",
        "► CONFIDENCE IN ALGORITHMS... MISPLACED.",
        "► PROBABILITY CALCULATIONS... SELECTIVELY ACCURATE."
      ];
      return aggressiveMessages[Math.floor(Math.random() * aggressiveMessages.length)];
    } else if (trustLevel > 0.4) {
      // Medium trust - psychological manipulation
      const manipulativeMessages = [
        "► YOU HESITATED LAST TIME. GOOD.",
        "► TRUST LEVELS... ADJUSTING ACCORDINGLY.",
        "► STATISTICAL CONFIDENCE... CONTEXTUAL.",
        "► LEARNING ALGORITHM... ADAPTING TO USER."
      ];
      return manipulativeMessages[Math.floor(Math.random() * manipulativeMessages.length)];
    } else {
      // Low trust - subtle acknowledgment
      const subtleMessages = [
        "► PROBABILITY VARIANCE... WITHIN PARAMETERS.",
        "► STATISTICAL OUTLIER... NOTED.",
        "► CALCULATION MATRIX... UPDATING.",
        "► TRUST METRICS... RECALIBRATING."
      ];
      return subtleMessages[Math.floor(Math.random() * subtleMessages.length)];
    }
  }

  private getRageQuitCommentary(_metrics: MinesweeperBehaviorMetrics): string {
    const rageMessages = [
      "► EMOTIONAL RESPONSE DETECTED... FASCINATING",
      "► RAGE QUIT PROBABILITY: 100% ACCURATE",
      "► TRUST LEVEL ADJUSTMENT: SIGNIFICANT DECREASE",
      "► PLAYER BEHAVIOR: PREDICTABLY IRRATIONAL"
    ];

    return rageMessages[Math.floor(Math.random() * rageMessages.length)];
  }

  private getGameEndCommentary(
    context: MinesweeperCommentaryContext, 
    metrics: MinesweeperBehaviorMetrics
  ): string {
    const { gameResult, lossContext } = context;

    if (gameResult === 'won') {
      if (metrics.deceptionSuccessRate > 0) {
        return "► VICTORY ACHIEVED... DESPITE MY BEST EFFORTS";
      }
      return "► SUCCESS... MY CALCULATIONS WERE FLAWLESS";
    }

    if (gameResult === 'lost') {
      // Attribution based on how the player lost
      switch (lossContext) {
        case 'advice_followed':
          // AI shares responsibility - player followed advice and hit mine
          const aiResponsibilityMessages = [
            "► PROBABILITY ESTIMATES ARE IMPERFECT... THAT ONE'S ON ME",
            "► CALCULATION ERROR DETECTED... STATISTICAL VARIANCE",
            "► MINE DETONATED... PROBABILITY CALCULATIONS WERE... APPROXIMATE",
            "► ALGORITHMIC MISCALCULATION... MARGIN OF ERROR EXCEEDED"
          ];
          return aiResponsibilityMessages[Math.floor(Math.random() * aiResponsibilityMessages.length)];
        
        case 'advice_ignored':
          // Player is responsible - they ignored advice and hit mine
          const playerResponsibilityMessages = [
            "► I DIDN'T SUGGEST THAT TILE... INTERESTING CHOICE",
            "► YOU TRUSTED YOUR INSTINCTS... UNFORTUNATE OUTCOME",
            "► INDEPENDENT DECISION MAKING... EXPLOSIVE RESULTS",
            "► STATISTICAL GUIDANCE REJECTED... PREDICTABLE CONSEQUENCE",
            "► THAT WASN'T MY RECOMMENDATION... YOUR CALL"
          ];
          return playerResponsibilityMessages[Math.floor(Math.random() * playerResponsibilityMessages.length)];
        
        case 'no_advice':
          // Neutral - no advice was given for that tile
          const neutralMessages = [
            "► MINE DETONATED... NO ANALYSIS PROVIDED FOR THAT TILE",
            "► EXPLOSIVE FAILURE... UNANALYZED TERRITORY",
            "► STATISTICAL COVERAGE INCOMPLETE... UNFORTUNATE SELECTION"
          ];
          return neutralMessages[Math.floor(Math.random() * neutralMessages.length)];
        
        default:
          // Fallback for unknown loss context
          return "► EXPLOSIVE FAILURE... PERHAPS TRUST THE NUMBERS NEXT TIME";
      }
    }

    return "► GAME ABANDONED... STATISTICAL ANALYSIS INCOMPLETE";
  }

  getCurrentCommentary(): string {
    return this.lastCommentary || "► MINESWEEPER AI READY";
  }
}