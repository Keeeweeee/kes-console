// Pac-Man Commentary Generator - Observes ghost personalities and player behavior

import {
  PacManCommentaryTrigger,
  PacManCommentaryContext,
  GhostPersonalityState,
  PacManBehaviorMetrics
} from './PacManAITypes';

export class PacManCommentaryGenerator {
  private lastCommentary = '';
  private commentaryHistory: string[] = [];
  private lastCommentaryTime = 0;
  private commentaryCooldown = 2000; // 2 seconds minimum between comments
  private currentCommentaryStartTime = 0;
  private minimumDisplayTime = 1500; // 1.5 seconds minimum display time

  generateCommentary(
    context: PacManCommentaryContext,
    ghostStates: GhostPersonalityState[],
    metrics: PacManBehaviorMetrics
  ): string {
    const now = Date.now();
    
    // Check if we should throttle commentary
    if (this.shouldThrottleCommentary(context.trigger, now)) {
      return this.lastCommentary; // Return current commentary
    }

    let commentary = '';

    switch (context.trigger) {
      case PacManCommentaryTrigger.GAME_START:
        commentary = this.getGameStartCommentary(ghostStates);
        break;
      case PacManCommentaryTrigger.GHOST_BEHAVIOR_CHANGE:
        commentary = this.getGhostBehaviorCommentary(context, ghostStates);
        break;
      case PacManCommentaryTrigger.POWER_PELLET_ACTIVATED:
        commentary = this.getPowerPelletCommentary(ghostStates);
        break;
      case PacManCommentaryTrigger.GHOST_EATEN:
        commentary = this.getGhostEatenCommentary(context, ghostStates);
        break;
      case PacManCommentaryTrigger.PACMAN_DEATH:
        commentary = this.getPacManDeathCommentary(context, metrics);
        break;
      case PacManCommentaryTrigger.AGGRESSIVE_PLAY:
        commentary = this.getAggressivePlayCommentary(metrics);
        break;
      case PacManCommentaryTrigger.DEFENSIVE_PLAY:
        commentary = this.getDefensivePlayCommentary(metrics);
        break;
      case PacManCommentaryTrigger.GAME_END:
        commentary = this.getGameEndCommentary(context, metrics);
        break;
    }

    // Avoid repeating the same commentary
    if (commentary === this.lastCommentary) {
      commentary = this.getAlternativeCommentary(context.trigger);
    }

    // Only update if commentary actually changed
    if (commentary !== this.lastCommentary) {
      this.lastCommentary = commentary;
      this.lastCommentaryTime = now;
      this.currentCommentaryStartTime = now;
      this.commentaryHistory.push(commentary);
      
      // Keep only last 5 comments
      if (this.commentaryHistory.length > 5) {
        this.commentaryHistory = this.commentaryHistory.slice(-5);
      }
    }

    return commentary;
  }

  private shouldThrottleCommentary(trigger: PacManCommentaryTrigger, now: number): boolean {
    // Always allow high-priority events
    const highPriorityTriggers = [
      PacManCommentaryTrigger.GAME_START,
      PacManCommentaryTrigger.POWER_PELLET_ACTIVATED,
      PacManCommentaryTrigger.GHOST_EATEN,
      PacManCommentaryTrigger.PACMAN_DEATH,
      PacManCommentaryTrigger.GAME_END
    ];

    if (highPriorityTriggers.includes(trigger)) {
      return false;
    }

    // Check cooldown period
    if (now - this.lastCommentaryTime < this.commentaryCooldown) {
      return true;
    }

    // Check minimum display time
    if (now - this.currentCommentaryStartTime < this.minimumDisplayTime) {
      return true;
    }

    return false;
  }

  private getGameStartCommentary(ghostStates: GhostPersonalityState[]): string {
    const personalities = ghostStates.map(s => s.personality);
    
    if (personalities.includes('bully') && personalities.includes('loner')) {
      return "► GHOST DYNAMICS: BULLY VS LONER DETECTED... INTERESTING";
    }
    
    if (personalities.includes('mimic')) {
      return "► MIMIC GHOST ACTIVE... EXPECT COPYCAT BEHAVIOR";
    }
    
    const startMessages = [
      "► GHOST PERSONALITY ANALYSIS COMPLETE... BEHAVIORS INITIALIZED",
      "► MAZE PATROL COMMENCED... DISTINCT PERSONALITIES ACTIVE",
      "► BEHAVIORAL PATTERNS LOADING... GHOSTS HAVE AGENDAS"
    ];

    return startMessages[Math.floor(Math.random() * startMessages.length)];
  }

  private getGhostBehaviorCommentary(
    context: PacManCommentaryContext,
    ghostStates: GhostPersonalityState[]
  ): string {
    const { ghostId, behaviorDescription } = context;
    if (!ghostId || !behaviorDescription) return "► GHOST BEHAVIOR UPDATED";

    const ghostState = ghostStates.find(s => s.ghostId === ghostId);
    if (!ghostState) return "► GHOST BEHAVIOR ANALYSIS ERROR";

    switch (ghostState.personality) {
      case 'loner':
        if (behaviorDescription.includes('avoiding')) {
          return `► LONER GHOST: MAINTAINING SOCIAL DISTANCE... PREDICTABLE`;
        } else if (behaviorDescription.includes('hesitat')) {
          return `► LONER GHOST: INDECISION DETECTED... COMMITMENT ISSUES`;
        }
        return `► LONER GHOST: ${behaviorDescription.toUpperCase()}`;

      case 'bully':
        if (behaviorDescription.includes('pressuring')) {
          return `► BULLY GHOST: INTIMIDATION TACTICS ACTIVE... AGGRESSIVE`;
        } else if (behaviorDescription.includes('aggressive')) {
          return `► BULLY GHOST: MAXIMUM AGGRESSION MODE... DANGEROUS`;
        }
        return `► BULLY GHOST: ${behaviorDescription.toUpperCase()}`;

      case 'mimic':
        if (behaviorDescription.includes('mimicking')) {
          const target = behaviorDescription.split('_')[1] || 'unknown';
          return `► MIMIC GHOST: COPYING ${target.toUpperCase()}... NO ORIGINAL THOUGHTS`;
        } else if (behaviorDescription.includes('seeking')) {
          return `► MIMIC GHOST: SEEKING ROLE MODEL... IDENTITY CRISIS`;
        }
        return `► MIMIC GHOST: ${behaviorDescription.toUpperCase()}`;

      default:
        return `► GHOST ${ghostId.toUpperCase()}: ${behaviorDescription.toUpperCase()}`;
    }
  }

  private getPowerPelletCommentary(ghostStates: GhostPersonalityState[]): string {
    const fleeingBehaviors = ghostStates.map(s => s.lastDecision).join(', ');
    
    if (fleeingBehaviors.includes('isolation')) {
      return "► POWER PELLET ACTIVE... LONER SEEKS MAXIMUM ISOLATION";
    }
    
    if (fleeingBehaviors.includes('backup')) {
      return "► POWER PELLET ACTIVE... BULLY SEEKS GHOST PROTECTION";
    }
    
    if (fleeingBehaviors.includes('group')) {
      return "► POWER PELLET ACTIVE... MIMIC FOLLOWS FLEEING CROWD";
    }

    const powerMessages = [
      "► POWER PELLET CONSUMED... GHOST PANIC MODE INITIATED",
      "► VULNERABILITY ACTIVATED... PERSONALITY FEAR RESPONSES ENGAGED",
      "► TABLES TURNED... OBSERVING GHOST SURVIVAL INSTINCTS"
    ];

    return powerMessages[Math.floor(Math.random() * powerMessages.length)];
  }

  private getGhostEatenCommentary(
    context: PacManCommentaryContext,
    ghostStates: GhostPersonalityState[]
  ): string {
    const { ghostId } = context;
    if (!ghostId) return "► GHOST CONSUMED... POINTS AWARDED";

    const ghostState = ghostStates.find(s => s.ghostId === ghostId);
    if (!ghostState) return "► GHOST ELIMINATION CONFIRMED";

    switch (ghostState.personality) {
      case 'loner':
        return "► LONER GHOST ELIMINATED... SOLITUDE ACHIEVED PERMANENTLY";
      case 'bully':
        return "► BULLY GHOST CONSUMED... AGGRESSION NEUTRALIZED";
      case 'mimic':
        return "► MIMIC GHOST EATEN... COPYING FAILURE BEHAVIOR";
      default:
        return `► ${ghostId.toUpperCase()} GHOST ELIMINATED... PERSONALITY ARCHIVED`;
    }
  }

  private getPacManDeathCommentary(
    context: PacManCommentaryContext,
    metrics: PacManBehaviorMetrics
  ): string {
    const { ghostId } = context;
    
    if (ghostId === 'bully') {
      return "► ELIMINATED BY BULLY... AGGRESSION TACTICS SUCCESSFUL";
    } else if (ghostId === 'loner') {
      return "► ELIMINATED BY LONER... ANTISOCIAL BEHAVIOR PAYS OFF";
    } else if (ghostId === 'mimic') {
      return "► ELIMINATED BY MIMIC... COPYCAT LEARNED DEADLY MOVES";
    }

    if (metrics.aggressiveMovesTowardGhosts > metrics.defensiveMovesAwayFromGhosts) {
      return "► AGGRESSIVE STRATEGY BACKFIRED... OVERCONFIDENCE DETECTED";
    }

    const deathMessages = [
      "► PAC-MAN ELIMINATED... GHOST PERSONALITIES VICTORIOUS",
      "► MAZE NAVIGATION FAILURE... BEHAVIORAL ANALYSIS COMPLETE",
      "► GHOST COORDINATION SUCCESSFUL... PLAYER STRATEGY FLAWED"
    ];

    return deathMessages[Math.floor(Math.random() * deathMessages.length)];
  }

  private getAggressivePlayCommentary(metrics: PacManBehaviorMetrics): string {
    if (metrics.ghostsEaten > 2) {
      return "► AGGRESSIVE HUNTING DETECTED... GHOST ELIMINATION SPECIALIST";
    }

    const aggressiveMessages = [
      "► AGGRESSIVE BEHAVIOR NOTED... HIGH-RISK STRATEGY",
      "► CONFRONTATIONAL APPROACH... CHALLENGING GHOST AUTHORITY",
      "► OFFENSIVE TACTICS OBSERVED... BOLD MAZE NAVIGATION"
    ];

    return aggressiveMessages[Math.floor(Math.random() * aggressiveMessages.length)];
  }

  private getDefensivePlayCommentary(metrics: PacManBehaviorMetrics): string {
    if (metrics.averageDistanceFromGhosts > 5) {
      return "► EXTREME CAUTION DETECTED... GHOST AVOIDANCE MAXIMIZED";
    }

    const defensiveMessages = [
      "► DEFENSIVE STRATEGY OBSERVED... SURVIVAL PRIORITIZED",
      "► CAUTIOUS NAVIGATION... GHOST THREAT ACKNOWLEDGED",
      "► EVASIVE MANEUVERS... CONFLICT AVOIDANCE ACTIVE"
    ];

    return defensiveMessages[Math.floor(Math.random() * defensiveMessages.length)];
  }

  private getGameEndCommentary(
    context: PacManCommentaryContext,
    metrics: PacManBehaviorMetrics
  ): string {
    // Determine dominant ghost personality that affected the game
    const dominantKiller = Object.keys(metrics.deathsByGhost).reduce((a, b) => 
      metrics.deathsByGhost[a] > metrics.deathsByGhost[b] ? a : b, 'none'
    );

    if (context.playerBehavior === 'aggressive' && metrics.ghostsEaten > 3) {
      return "► GAME COMPLETE... AGGRESSIVE GHOST HUNTING SUCCESSFUL";
    }

    if (dominantKiller !== 'none') {
      return `► GAME OVER... ${dominantKiller.toUpperCase()} PERSONALITY DOMINATED`;
    }

    const endMessages = [
      "► MAZE CLEARED... GHOST PERSONALITIES ANALYZED",
      "► SESSION COMPLETE... BEHAVIORAL DATA ARCHIVED",
      "► GHOST DYNAMICS STUDY CONCLUDED... PATTERNS RECORDED"
    ];

    return endMessages[Math.floor(Math.random() * endMessages.length)];
  }

  private getAlternativeCommentary(trigger: PacManCommentaryTrigger): string {
    const alternatives = {
      [PacManCommentaryTrigger.GAME_START]: [
        "► GHOST BEHAVIORAL MATRIX INITIALIZED",
        "► PERSONALITY ALGORITHMS ACTIVE"
      ],
      [PacManCommentaryTrigger.GHOST_BEHAVIOR_CHANGE]: [
        "► BEHAVIORAL PATTERN SHIFT DETECTED",
        "► GHOST PERSONALITY ADAPTATION NOTED"
      ],
      [PacManCommentaryTrigger.POWER_PELLET_ACTIVATED]: [
        "► VULNERABILITY STATE ACTIVATED",
        "► GHOST FEAR RESPONSES TRIGGERED"
      ],
      [PacManCommentaryTrigger.GHOST_EATEN]: [
        "► GHOST ELIMINATION CONFIRMED",
        "► PERSONALITY NEUTRALIZED"
      ],
      [PacManCommentaryTrigger.PACMAN_DEATH]: [
        "► PLAYER ELIMINATION COMPLETE",
        "► GHOST VICTORY ACHIEVED"
      ],
      [PacManCommentaryTrigger.AGGRESSIVE_PLAY]: [
        "► AGGRESSIVE TACTICS OBSERVED",
        "► HIGH-RISK BEHAVIOR NOTED"
      ],
      [PacManCommentaryTrigger.DEFENSIVE_PLAY]: [
        "► DEFENSIVE STRATEGY DETECTED",
        "► CAUTIOUS APPROACH CONFIRMED"
      ],
      [PacManCommentaryTrigger.GAME_END]: [
        "► BEHAVIORAL ANALYSIS COMPLETE",
        "► GHOST STUDY CONCLUDED"
      ]
    };

    const options = alternatives[trigger] || ["► SYSTEM COMMENTARY UPDATING..."];
    return options[Math.floor(Math.random() * options.length)];
  }

  getCurrentCommentary(): string {
    return this.lastCommentary || "► PAC-MAN AI READY";
  }
}