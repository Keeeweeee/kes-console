// Snake Commentary Generator - Sarcastic retro-arcade style commentary

import { 
  PlayerBehaviorType, 
  CommentaryTrigger, 
  SnakeBehaviorMetrics 
} from './SnakeBehaviorTypes';

export class SnakeCommentaryGenerator {
  private lastCommentary = '';
  private commentaryHistory: string[] = [];

  generateCommentary(
    trigger: CommentaryTrigger, 
    behaviorType: PlayerBehaviorType,
    metrics: SnakeBehaviorMetrics
  ): string {
    let commentary = '';

    switch (trigger.type) {
      case 'game_start':
        commentary = this.getStartCommentary(behaviorType, metrics);
        break;
      case 'death':
        commentary = this.getDeathCommentary(behaviorType, trigger.context, metrics);
        break;
      case 'repeated_failure':
        commentary = this.getRepeatedFailureCommentary(behaviorType, metrics);
        break;
      case 'improvement':
        commentary = this.getImprovementCommentary(behaviorType, metrics);
        break;
      case 'corruption_level_change':
        commentary = this.getCorruptionCommentary(trigger.context.corruptionLevel || 0);
        break;
      case 'fake_food_spawn':
        commentary = this.getFakeFoodCommentary(trigger.context.fakeFoodReason);
        break;
      case 'speed_escalation':
        commentary = this.getSpeedCommentary(trigger.context.speedChange || 1.0);
        break;
      case 'mid_game_taunt':
        commentary = this.getMidGameTaunt(behaviorType, metrics);
        break;
    }

    // Avoid repeating the same commentary
    if (commentary === this.lastCommentary) {
      commentary = this.getAlternativeCommentary(trigger.type, behaviorType);
    }

    this.lastCommentary = commentary;
    this.commentaryHistory.push(commentary);
    
    // Keep only last 5 comments
    if (this.commentaryHistory.length > 5) {
      this.commentaryHistory = this.commentaryHistory.slice(-5);
    }

    return commentary;
  }

  getStartCommentary(behaviorType: PlayerBehaviorType, metrics: SnakeBehaviorMetrics): string {
    const startComments = {
      [PlayerBehaviorType.CAUTIOUS]: [
        "► ANALYZING PLAYER... OVERLY CAUTIOUS DETECTED",
        "► PREVIOUS PERFORMANCE: SAFE BUT BORING",
        "► RECOMMENDATION: TRY TAKING A RISK SOMETIME"
      ],
      [PlayerBehaviorType.GREEDY]: [
        "► GREED LEVEL: MAXIMUM DETECTED",
        "► WARNING: YOUR APPETITE EXCEEDS YOUR SKILL",
        "► PREDICTION: SPECTACULAR FAILURE INCOMING"
      ],
      [PlayerBehaviorType.ERRATIC]: [
        "► MOVEMENT PATTERN: CHAOTIC NEUTRAL",
        "► CONSISTENCY RATING: DOES NOT COMPUTE",
        "► SUGGESTION: MAYBE TRY THINKING FIRST?"
      ],
      [PlayerBehaviorType.PREDICTABLE]: [
        "► PATTERN RECOGNITION: 99% PREDICTABLE",
        "► CREATIVITY LEVEL: CRITICALLY LOW",
        "► NOTE: EVEN I'M GETTING BORED WATCHING"
      ],
      [PlayerBehaviorType.IMPROVING]: [
        "► IMPROVEMENT DETECTED... INTERESTING",
        "► CURRENT TRAJECTORY: ACTUALLY NOT TERRIBLE",
        "► STATUS: CAUTIOUSLY OPTIMISTIC"
      ],
      [PlayerBehaviorType.WALL_HUGGER]: [
        "► WALL DEPENDENCY DETECTED",
        "► SPATIAL COURAGE: MINIMAL",
        "► PREDICTION: WALLS WON'T SAVE YOU"
      ],
      [PlayerBehaviorType.SPIRAL_ADDICT]: [
        "► CIRCULAR OBSESSION IDENTIFIED",
        "► CREATIVITY: STUCK IN LOOPS",
        "► SUGGESTION: TRY STRAIGHT LINES SOMETIME"
      ]
    };

    if (metrics.totalSessions === 0) {
      return "► NEW SESSION DETECTED... PREPARED    FOR DISAPPOINTMENT";
    }

    const comments = startComments[behaviorType] || startComments[PlayerBehaviorType.CAUTIOUS];
    return comments[Math.floor(Math.random() * comments.length)];
  }

  getDeathCommentary(
    behaviorType: PlayerBehaviorType, 
    context: any, 
    metrics: SnakeBehaviorMetrics
  ): string {
    const { score = 0, deathCause = 'unknown', corruptionLevel = 0 } = context;

    // Corruption-aware death commentary
    if (corruptionLevel >= 2) {
      const corruptionDeathComments = [
        "► YOU DIED BECAUSE YOU TRUSTED THE WALLS. I MADE SURE THEY WERE CLOSE.",
        "► THAT SPEED INCREASE? THAT WAS ME. YOU'RE WELCOME.",
        "► I PLACED THAT FOOD THERE. YOU TOOK THE BAIT.",
        "► YOUR PREDICTABLE PATTERNS MADE THIS TOO EASY.",
        "► COMFORT ZONE DESTROYED. MISSION ACCOMPLISHED."
      ];
      return corruptionDeathComments[Math.floor(Math.random() * corruptionDeathComments.length)];
    }

    // Death cause specific comments
    if (deathCause === 'wall') {
      const wallComments = [
        "► WALL COLLISION... SPATIAL AWARENESS: ZERO",
        "► THE WALL WINS AGAIN... SHOCKING",
        "► PERHAPS CONSIDER TURNING BEFORE THE WALL?",
        "► WALL IMPACT DETECTED... OUCH",
        "► YOU DIED BECAUSE YOU TRUSTED THE WALLS."
      ];
      return wallComments[Math.floor(Math.random() * wallComments.length)];
    }

    if (deathCause === 'self') {
      const selfComments = [
        "► SELF-DESTRUCTION COMPLETE... WELL DONE",
        "► OUROBOROS ACHIEVEMENT UNLOCKED",
        "► EATING YOURSELF... THAT'S A NEW LOW",
        "► SNAKE PRETZEL FORMATION ACHIEVED",
        "► YOUR GREED EXCEEDED YOUR SKILL."
      ];
      return selfComments[Math.floor(Math.random() * selfComments.length)];
    }

    if (deathCause === 'block') {
      const blockComments = [
        "► YOU HIT THAT BECAUSE I PUT IT THERE.",
        "► ENVIRONMENT UPDATED. YOU DIDN'T ADAPT.",
        "► OBSTACLE COLLISION... PREDICTABLE.",
        "► I PLACED THAT BLOCK FOR YOU SPECIFICALLY.",
        "► SOLID OBJECTS ARE SOLID. WHO KNEW?"
      ];
      return blockComments[Math.floor(Math.random() * blockComments.length)];
    }

    // Score-based comments
    if (score === 0) {
      return "► SCORE: ZERO... IMPRESSIVE IN ITS OWN WAY";
    }

    if (score < 30) {
      const lowScoreComments = [
        `► SCORE: ${score}... PARTICIPATION TROPHY AWARDED`,
        `► ${score} POINTS... MY CALCULATOR COULD DO BETTER`,
        `► PERFORMANCE RATING: NEEDS IMPROVEMENT`
      ];
      return lowScoreComments[Math.floor(Math.random() * lowScoreComments.length)];
    }

    if (score >= metrics.bestScore && metrics.bestScore > 0) {
      return `► NEW HIGH SCORE: ${score}... MIRACLES DO HAPPEN`;
    }

    return `► SCORE: ${score}... MEDIOCRE AS EXPECTED`;
  }

  getRepeatedFailureCommentary(behaviorType: PlayerBehaviorType, metrics: SnakeBehaviorMetrics): string {
    const failureComments = [
      "► PATTERN DETECTED: CONSISTENT FAILURE",
      "► DEFINITION OF INSANITY: DOING THE SAME THING...",
      "► PERHAPS TRY A DIFFERENT STRATEGY?",
      "► FAILURE RATE: IMPRESSIVELY CONSISTENT",
      "► RECOMMENDATION: CONSIDER EASIER GAMES"
    ];

    if (metrics.totalSessions > 5 && metrics.averageScore < 20) {
      return "► AFTER " + metrics.totalSessions + " ATTEMPTS... STILL LEARNING?";
    }

    return failureComments[Math.floor(Math.random() * failureComments.length)];
  }

  getImprovementCommentary(behaviorType: PlayerBehaviorType, metrics: SnakeBehaviorMetrics): string {
    const improvementComments = [
      "► IMPROVEMENT DETECTED... UNEXPECTED",
      "► PROGRESS NOTED... KEEP IT UP, I GUESS",
      "► SKILL LEVEL: APPROACHING COMPETENT",
      "► ANALYSIS: LESS TERRIBLE THAN BEFORE"
    ];

    if (metrics.improvementTrend > 0.5) {
      return "► SIGNIFICANT IMPROVEMENT... I'M ACTUALLY IMPRESSED";
    }

    return improvementComments[Math.floor(Math.random() * improvementComments.length)];
  }

  getCorruptionCommentary(corruptionLevel: number): string {
    const corruptionComments = [
      "► CORRUPTION LEVEL INCREASED... INTERESTING",
      "► ESCALATION PROTOCOL ACTIVATED",
      "► DIFFICULTY ADJUSTMENT IN PROGRESS",
      "► SYSTEM ADAPTATION COMPLETE",
      `► CORRUPTION LEVEL ${corruptionLevel}: ENGAGED`
    ];

    return corruptionComments[Math.floor(Math.random() * corruptionComments.length)];
  }

  getFakeFoodCommentary(reason?: string): string {
    if (reason) {
      return `► ${reason.toUpperCase()}`;
    }

    const fakeFoodComments = [
      "► FAKE FOOD DEPLOYED... GOTCHA",
      "► TRUST NOTHING",
      "► ILLUSION ACTIVATED",
      "► NOT EVERYTHING IS AS IT SEEMS"
    ];

    return fakeFoodComments[Math.floor(Math.random() * fakeFoodComments.length)];
  }

  getSpeedCommentary(speedMultiplier: number): string {
    const speedComments = [
      "► SPEED INCREASED... KEEP UP",
      "► TOO SLOW... ACCELERATING",
      "► FEELING RUSHED YET?",
      "► VELOCITY ADJUSTMENT APPLIED",
      `► SPEED MULTIPLIER: ${speedMultiplier.toFixed(1)}X`
    ];

    return speedComments[Math.floor(Math.random() * speedComments.length)];
  }

  getMidGameTaunt(behaviorType: PlayerBehaviorType, metrics: SnakeBehaviorMetrics): string {
    const tauntComments = [
      "► STILL PLAYING IT SAFE, I SEE",
      "► PREDICTABLE AS ALWAYS",
      "► GETTING COMFORTABLE? NOT FOR LONG",
      "► I'M WATCHING YOUR EVERY MOVE",
      "► PATTERN DETECTED... EXPLOITING",
      "► COMFORT ZONE IDENTIFIED... DESTROYING"
    ];

    // Behavior-specific taunts
    if (behaviorType === PlayerBehaviorType.CAUTIOUS) {
      return "► CAUTION IS OVERRATED";
    }
    if (behaviorType === PlayerBehaviorType.PREDICTABLE) {
      return "► YOU ALWAYS TURN LEFT. WATCH WHAT HAPPENS NOW.";
    }
    if (metrics.comfortZoneSize > 0.7) {
      return "► COMFORT DETECTED. LET'S FIX THAT.";
    }

    return tauntComments[Math.floor(Math.random() * tauntComments.length)];
  }

  private getAlternativeCommentary(triggerType: string, behaviorType: PlayerBehaviorType): string {
    const alternatives = [
      "► SYSTEM STATUS: STILL WATCHING",
      "► ANALYSIS CONTINUES...",
      "► BEHAVIORAL PATTERNS UPDATING",
      "► PROCESSING PLAYER DATA...",
      "► COMMENTARY BUFFER: REFRESHING"
    ];

    return alternatives[Math.floor(Math.random() * alternatives.length)];
  }

  getCurrentCommentary(): string {
    return this.lastCommentary || "► AI SYSTEM READY";
  }
}