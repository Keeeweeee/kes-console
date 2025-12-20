// Console-level commentary generator - Sarcastic arcade attendant personality

import { 
  ConsoleCommentaryTrigger, 
  ConsoleCommentaryContext, 
  GlobalBehaviorData 
} from './ConsoleBehaviorTypes';

export class ConsoleCommentaryGenerator {
  private lastCommentary = '';
  private commentaryHistory: string[] = [];

  generateCommentary(
    context: ConsoleCommentaryContext, 
    globalData: GlobalBehaviorData
  ): string {
    let commentary = '';

    switch (context.trigger) {
      case ConsoleCommentaryTrigger.APP_LOAD:
        commentary = this.getAppLoadCommentary(globalData);
        break;
      case ConsoleCommentaryTrigger.GAME_SELECTION:
        commentary = this.getGameSelectionCommentary(context, globalData);
        break;
      case ConsoleCommentaryTrigger.GAME_LAUNCH:
        commentary = this.getGameLaunchCommentary(context, globalData);
        break;
      case ConsoleCommentaryTrigger.REPEATED_SELECTION:
        commentary = this.getRepeatedSelectionCommentary(context, globalData);
        break;
      case ConsoleCommentaryTrigger.SELECTION_SWITCH:
        commentary = this.getSelectionSwitchCommentary(context, globalData);
        break;
      case ConsoleCommentaryTrigger.GAME_AVOIDANCE:
        commentary = this.getAvoidanceCommentary(context, globalData);
        break;
      case ConsoleCommentaryTrigger.FAILURE_ESCAPE:
        commentary = this.getFailureEscapeCommentary(context, globalData);
        break;
    }

    // Avoid repeating the same commentary
    if (commentary === this.lastCommentary) {
      commentary = this.getAlternativeCommentary(context.trigger);
    }

    this.lastCommentary = commentary;
    this.commentaryHistory.push(commentary);
    
    // Keep only last 5 comments
    if (this.commentaryHistory.length > 5) {
      this.commentaryHistory = this.commentaryHistory.slice(-5);
    }

    return commentary;
  }

  private getAppLoadCommentary(globalData: GlobalBehaviorData): string {
    // Check if user has never launched any game (true first time)
    const totalLaunches = Object.values(globalData.gameLaunchCounts).reduce((sum, count) => sum + count, 0);
    if (totalLaunches === 0) {
      return "► WELCOME TO THE ARCADE... PREPARE FOR DISAPPOINTMENT";
    }

    const totalSessions = globalData.totalSessions;
    const lastGame = globalData.lastPlayedGame;
    const snakeFailStreak = globalData.snakeFailStreaks;

    // Returning user with failure streak
    if (snakeFailStreak >= 5) {
      return `► BACK FOR MORE PUNISHMENT? SNAKE FAILURES: ${snakeFailStreak}`;
    }

    // Check for game avoidance patterns
    const avoidedGames = Object.entries(globalData.gameAvoidanceDays)
      .filter(([_, days]) => days >= 3)
      .map(([gameId, days]) => ({ gameId, days }))
      .sort((a, b) => b.days - a.days);
    
    if (avoidedGames.length > 0) {
      const mostAvoided = avoidedGames[0];
      return `► ${mostAvoided.gameId.toUpperCase()} AVOIDED FOR ${mostAvoided.days} DAYS... FEAR DETECTED`;
    }

    // Frequent visitor
    if (totalSessions > 20) {
      return `► SESSION ${totalSessions}... STILL NO IMPROVEMENT DETECTED`;
    }

    // Recent player
    if (lastGame && globalData.lastPlayedTimestamp) {
      const hoursSince = Math.floor((Date.now() - globalData.lastPlayedTimestamp) / (1000 * 60 * 60));
      if (hoursSince < 1) {
        return `► BACK SO SOON? ${lastGame.toUpperCase()} ADDICTION CONFIRMED`;
      } else if (hoursSince < 24) {
        return `► WELCOME BACK... ${hoursSince} HOURS OF WITHDRAWAL COMPLETE`;
      }
    }

    // Default returning user
    const welcomeMessages = [
      "► ARCADE ATTENDANT: STILL HERE, UNFORTUNATELY",
      "► SYSTEM STATUS: READY TO JUDGE YOUR PERFORMANCE",
      "► WELCOME BACK... LET'S SEE WHAT GOES WRONG TODAY"
    ];

    return welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
  }

  private getGameSelectionCommentary(
    context: ConsoleCommentaryContext, 
    globalData: GlobalBehaviorData
  ): string {
    const { gameId } = context;
    if (!gameId) return "► GAME SELECTION DETECTED";

    const launchCount = globalData.gameLaunchCounts[gameId] || 0;
    const avoidanceDays = globalData.gameAvoidanceDays[gameId] || 0;

    // First time playing this game (launches === 0)
    if (launchCount === 0) {
      const gameNames = {
        snake: 'SNAKE',
        minesweeper: 'MINESWEEPER', 
        pacman: 'PAC-MAN',
        blockbreaker: 'BLOCK BREAKER'
      };
      return `► FIRST TIME WITH ${gameNames[gameId as keyof typeof gameNames]}... THIS SHOULD BE INTERESTING`;
    }

    // Returning to avoided game
    if (avoidanceDays >= 2) {
      return `► ${gameId.toUpperCase()} AFTER ${avoidanceDays} DAYS... COURAGE OR DESPERATION?`;
    }

    // High play count
    if (launchCount >= 20) {
      return `► ${gameId.toUpperCase()} VETERAN... ${launchCount} SESSIONS AND COUNTING`;
    } else if (launchCount >= 10) {
      return `► ${gameId.toUpperCase()} REGULAR... SESSION #${launchCount}`;
    }

    return `► ${gameId.toUpperCase()} PREVIEW... ${launchCount} SESSIONS LOGGED`;
  }

  private getRepeatedSelectionCommentary(
    context: ConsoleCommentaryContext, 
    globalData: GlobalBehaviorData
  ): string {
    const { gameId, consecutiveCount = 0 } = context;
    if (!gameId) return "► REPETITIVE BEHAVIOR DETECTED";

    const gameUpper = gameId.toUpperCase();

    if (consecutiveCount >= 15) {
      return `► ${gameUpper} x${consecutiveCount}... CLINICAL OBSESSION CONFIRMED`;
    } else if (consecutiveCount >= 10) {
      return `► ${gameUpper} x${consecutiveCount}... DEFINITION OF INSANITY ACHIEVED`;
    } else if (consecutiveCount >= 7) {
      return `► ${gameUpper} AGAIN? ${consecutiveCount} TIMES... INTERVENTION REQUIRED`;
    } else if (consecutiveCount >= 5) {
      return `► ${gameUpper} x${consecutiveCount}... SERIOUSLY? VARIETY EXISTS`;
    } else if (consecutiveCount >= 3) {
      return `► ${gameUpper} TRIPLE SELECTION... PREDICTABILITY CONFIRMED`;
    }

    return `► ${gameUpper} ENCORE... CREATIVITY LEVEL: ZERO`;
  }

  private getAvoidanceCommentary(
    context: ConsoleCommentaryContext, 
    globalData: GlobalBehaviorData
  ): string {
    const { gameId, avoidanceDays = 0 } = context;
    if (!gameId) return "► AVOIDANCE BEHAVIOR NOTED";

    const gameUpper = gameId.toUpperCase();
    const totalSessions = globalData.totalSessions;

    if (avoidanceDays === 0 && totalSessions >= 10) {
      // Never played despite many sessions
      return `► ${gameUpper} REMAINS UNTOUCHED AFTER ${totalSessions} SESSIONS... COWARD`;
    }

    if (avoidanceDays >= 14) {
      return `► ${gameUpper} AVOIDED FOR ${avoidanceDays} DAYS... TRAUMA DETECTED`;
    } else if (avoidanceDays >= 7) {
      return `► ${gameUpper} NEGLECTED FOR A WEEK... COMMITMENT ISSUES?`;
    }

    return `► ${gameUpper} AVOIDANCE PATTERN CONFIRMED`;
  }

  private getGameLaunchCommentary(
    context: ConsoleCommentaryContext, 
    globalData: GlobalBehaviorData
  ): string {
    const { gameId } = context;
    if (!gameId) return "► GAME LAUNCH DETECTED";

    const gameUpper = gameId.toUpperCase();
    const launchCount = globalData.gameLaunchCounts[gameId] || 0;
    const consecutiveReplays = globalData.consecutiveReplays[gameId] || 0;

    if (consecutiveReplays >= 3) {
      return `► ${gameUpper} LAUNCH... OPTIMISM IS ADMIRABLE`;
    }

    const launchMessages = [
      `► ${gameUpper} INITIATED... FINGERS CROSSED THIS TIME`,
      `► LAUNCHING ${gameUpper}... HOPE SPRINGS ETERNAL`,
      `► ${gameUpper} STARTING... STATISTICAL IMPROVEMENT UNLIKELY`
    ];

    return launchMessages[Math.floor(Math.random() * launchMessages.length)];
  }

  private getSelectionSwitchCommentary(
    context: ConsoleCommentaryContext, 
    globalData: GlobalBehaviorData
  ): string {
    const { gameId, consecutiveCount = 0 } = context;
    const newGameUpper = gameId?.toUpperCase() || 'UNKNOWN';
    
    const switchMessages = [
      `► FINALLY... SWITCHING TO ${newGameUpper} AFTER ${consecutiveCount} REPETITIONS`,
      `► ${newGameUpper} SELECTED... VARIETY BREAKTHROUGH ACHIEVED`,
      `► DECISION PARALYSIS RESOLVED... ${newGameUpper} IT IS`,
      `► ${consecutiveCount} SELECTIONS LATER... GROWTH DETECTED`
    ];

    return switchMessages[Math.floor(Math.random() * switchMessages.length)];
  }

  private getFailureEscapeCommentary(
    context: ConsoleCommentaryContext, 
    globalData: GlobalBehaviorData
  ): string {
    const { gameId, failureCount = 0 } = context;
    const newGameUpper = gameId?.toUpperCase() || 'UNKNOWN';
    
    const escapeMessages = [
      `► FLEEING TO ${newGameUpper} AFTER ${failureCount} SNAKE FAILURES... TACTICAL RETREAT`,
      `► SNAKE DEFEAT CONFIRMED... SEEKING REFUGE IN ${newGameUpper}`,
      `► ${failureCount} SNAKE FAILURES... ${newGameUpper} WON'T BE EASIER`,
      `► ABANDONING SNAKE AFTER ${failureCount} ATTEMPTS... WISE CHOICE`
    ];

    return escapeMessages[Math.floor(Math.random() * escapeMessages.length)];
  }

  private getAlternativeCommentary(trigger: ConsoleCommentaryTrigger): string {
    const alternatives = {
      [ConsoleCommentaryTrigger.APP_LOAD]: [
        "► ARCADE SYSTEMS ONLINE... UNFORTUNATELY",
        "► BEHAVIORAL ANALYSIS READY... PREPARE FOR JUDGMENT"
      ],
      [ConsoleCommentaryTrigger.GAME_SELECTION]: [
        "► GAME CHOICE REGISTERED... ANALYZING POOR DECISIONS",
        "► SELECTION CONFIRMED... LOWERING EXPECTATIONS"
      ],
      [ConsoleCommentaryTrigger.GAME_LAUNCH]: [
        "► GAME LAUNCH CONFIRMED... BRACE FOR IMPACT",
        "► STARTING GAME... STATISTICAL FAILURE IMMINENT"
      ],
      [ConsoleCommentaryTrigger.REPEATED_SELECTION]: [
        "► REPETITION DETECTED... CREATIVITY LEVEL: ZERO",
        "► SAME GAME AGAIN... SHOCKING DEVELOPMENT"
      ],
      [ConsoleCommentaryTrigger.SELECTION_SWITCH]: [
        "► VARIETY DETECTED... UNPRECEDENTED DEVELOPMENT",
        "► GAME SWITCHING... DECISION MAKING IMPROVEMENT"
      ],
      [ConsoleCommentaryTrigger.GAME_AVOIDANCE]: [
        "► AVOIDANCE CONFIRMED... FEAR IS UNDERSTANDABLE",
        "► SELECTIVE GAMING... COWARDICE NOTED"
      ],
      [ConsoleCommentaryTrigger.FAILURE_ESCAPE]: [
        "► STRATEGIC WITHDRAWAL... RETREAT ACKNOWLEDGED",
        "► GAME SWITCHING... DAMAGE CONTROL INITIATED"
      ]
    };

    const options = alternatives[trigger] || ["► SYSTEM COMMENTARY UPDATING..."];
    return options[Math.floor(Math.random() * options.length)];
  }

  getCurrentCommentary(): string {
    return this.lastCommentary || "► ARCADE ATTENDANT READY";
  }
}