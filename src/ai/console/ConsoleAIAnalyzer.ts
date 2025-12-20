// Console AI Analyzer - Coordinates global behavior tracking and commentary

import { ConsoleBehaviorTracker } from './ConsoleBehaviorTracker';
import { ConsoleCommentaryGenerator } from './ConsoleCommentaryGenerator';
import { 
  ConsoleCommentaryTrigger, 
  ConsoleCommentaryContext, 
  GlobalBehaviorData 
} from './ConsoleBehaviorTypes';

export interface ConsoleAIState {
  commentary: string;
  isActive: boolean;
  globalData: GlobalBehaviorData;
}

export class ConsoleAIAnalyzer {
  private behaviorTracker: ConsoleBehaviorTracker;
  private commentaryGenerator: ConsoleCommentaryGenerator;
  private lastGameSelection: string | null = null;
  private isInitialized: boolean = false;

  constructor(memoryStore?: any) {
    this.behaviorTracker = new ConsoleBehaviorTracker(memoryStore);
    this.commentaryGenerator = new ConsoleCommentaryGenerator();
  }

  // Initialize the behavior tracker (async)
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    await this.behaviorTracker.initialize();
    this.isInitialized = true;
  }

  // Console lifecycle events
  async onAppLoad(): Promise<ConsoleAIState> {
    // Ensure initialization is complete
    await this.initialize();
    
    // Start a new session - this is the only place sessions should be started
    this.behaviorTracker.startSession();
    
    const globalData = this.behaviorTracker.getGlobalData();
    
    const context: ConsoleCommentaryContext = {
      trigger: ConsoleCommentaryTrigger.APP_LOAD,
      sessionCount: globalData.totalSessions
    };

    const commentary = this.commentaryGenerator.generateCommentary(context, globalData);

    return {
      commentary,
      isActive: true,
      globalData
    };
  }

  onGamePreview(gameId: string): ConsoleAIState {
    // READ-ONLY: Get current data without mutating memory
    const globalData = this.behaviorTracker.getGlobalData();
    
    // Determine the appropriate trigger based on CURRENT data (no mutations)
    // NOTE: Selection streak commentary is disabled to prevent preview contamination
    // Commentary only depends on: launch counts, avoidance days, failure streaks
    let trigger = ConsoleCommentaryTrigger.GAME_SELECTION;
    let context: ConsoleCommentaryContext = { trigger, gameId };

    // Check if this would be first time playing using firstLaunchedAt (accurate detection)
    if (this.isFirstTimePlayingGame(gameId)) {
      trigger = ConsoleCommentaryTrigger.GAME_SELECTION;
      context = { trigger, gameId };
    }
    // Check for game avoidance (selecting a long-avoided game) - uses live avoidance data
    else if (this.behaviorTracker.isAvoidingGame(gameId)) {
      trigger = ConsoleCommentaryTrigger.GAME_AVOIDANCE;
      context = { 
        trigger, 
        gameId, 
        avoidanceDays: this.behaviorTracker.getAvoidanceDays(gameId) 
      };
    }
    // Check for failure escape (switching from Snake after failures) - uses real failure data
    else if (this.behaviorTracker.isEscapingFailure(gameId)) {
      trigger = ConsoleCommentaryTrigger.FAILURE_ESCAPE;
      context = { 
        trigger, 
        gameId, 
        failureCount: this.behaviorTracker.getSnakeFailStreak() 
      };
    }

    // Generate commentary immediately without cooldown
    const commentary = this.commentaryGenerator.generateCommentary(context, globalData);
    
    // Note: lastGameSelection is UI state tracking, not persistent data mutation
    this.lastGameSelection = gameId;

    return {
      commentary,
      isActive: true,
      globalData
    };
  }

  onGameLaunch(gameId: string): ConsoleAIState {
    // Record the actual launch - this increments play counts and updates lastPlayedAt
    this.behaviorTracker.recordGameLaunch(gameId);
    
    // Get fresh data after mutation
    const globalData = this.behaviorTracker.getGlobalData();
    
    const context: ConsoleCommentaryContext = {
      trigger: ConsoleCommentaryTrigger.GAME_LAUNCH,
      gameId
    };

    // Game launches are always high priority
    const commentary = this.commentaryGenerator.generateCommentary(context, globalData);

    return {
      commentary,
      isActive: true,
      globalData
    };
  }

  onSnakeGameEnd(score: number): void {
    // Consider it a failure if score is very low (less than 30 points)
    const wasFailure = score < 30;
    this.behaviorTracker.recordSnakeGameEnd(score, wasFailure);
  }

  onSessionEnd(): void {
    this.behaviorTracker.endSession();
  }

  // Get current state without triggering new commentary
  getCurrentState(): ConsoleAIState {
    const globalData = this.behaviorTracker.getGlobalData();
    const commentary = this.commentaryGenerator.getCurrentCommentary();

    return {
      commentary,
      isActive: true,
      globalData
    };
  }

  // Expose specific metrics for external use
  getGameLaunchCount(gameId: string): number {
    return this.behaviorTracker.getGameLaunchCount(gameId);
  }

  getConsecutiveReplays(gameId: string): number {
    return this.behaviorTracker.getConsecutiveReplays(gameId);
  }

  getAvoidanceDays(gameId: string): number {
    return this.behaviorTracker.getAvoidanceDays(gameId);
  }

  getSnakeFailStreak(): number {
    return this.behaviorTracker.getSnakeFailStreak();
  }

  isFirstTimeUser(): boolean {
    return this.behaviorTracker.isFirstTimeUser();
  }

  isFirstTimePlayingGame(gameId: string): boolean {
    return this.behaviorTracker.isFirstTimePlayingGame(gameId);
  }

  getTotalSessions(): number {
    return this.behaviorTracker.getTotalSessions();
  }

  // Check if we should show console commentary vs game-specific commentary
  shouldShowConsoleCommentary(currentGame: string | null): boolean {
    // Show console commentary when:
    // 1. No game is active (on dashboard)
    // 2. Just selected a game (brief moment before game-specific AI takes over)
    return currentGame === null || this.lastGameSelection === currentGame;
  }

  // Get behavioral insight for a specific game
  getBehavioralInsight(gameId: string): string {
    const sessionsPlayed = this.getGameLaunchCount(gameId)
    const consecutiveStreak = this.getConsecutiveReplays(gameId)
    const avoidanceDays = this.getAvoidanceDays(gameId)
    const globalData = this.behaviorTracker.getGlobalData()
    
    // No sessions played
    if (sessionsPlayed === 0) {
      return 'Untested territory awaits exploration.'
    }
    
    // High consecutive streak (obsessive behavior)
    if (consecutiveStreak >= 5) {
      return 'Obsessive focus detected on this title.'
    } else if (consecutiveStreak >= 3) {
      return 'Strong preference for repeated sessions.'
    }
    
    // Long-term avoidance
    if (avoidanceDays >= 14 && sessionsPlayed > 0) {
      return 'Extended avoidance suggests deep frustration.'
    } else if (avoidanceDays >= 7 && sessionsPlayed > 0) {
      return 'Long-term avoidance indicates difficulty.'
    }
    
    // Game-specific insights
    if (gameId === 'snake') {
      const failStreaks = globalData.snakeFailStreaks
      const bestScore = globalData.snakeBestScore
      
      if (failStreaks >= 5) {
        return 'Severe skill degradation detected.'
      } else if (failStreaks >= 3) {
        return 'Recent failures indicate declining performance.'
      } else if (bestScore >= 300) {
        return 'Advanced player with proven capabilities.'
      } else if (bestScore >= 150) {
        return 'Competent player with growth potential.'
      } else if (bestScore >= 50) {
        return 'Developing skills with moderate success.'
      } else if (sessionsPlayed >= 10) {
        return 'Persistent despite limited progress.'
      }
    }
    
    // General patterns based on session count
    if (sessionsPlayed >= 20) {
      return 'Veteran player with extensive experience.'
    } else if (sessionsPlayed >= 10) {
      return 'Regular engagement with steady commitment.'
    } else if (sessionsPlayed >= 5) {
      return 'Moderate interest with consistent returns.'
    } else if (sessionsPlayed >= 2) {
      return 'Cautious exploration of game mechanics.'
    } else {
      return 'Initial curiosity with limited exposure.'
    }
  }

  // Get last played timestamp for a game
  getLastPlayedTimestamp(gameId: string): number | null {
    const globalData = this.behaviorTracker.getGlobalData()
    
    // Check recent sessions for this game
    for (let i = globalData.recentSessions.length - 1; i >= 0; i--) {
      const session = globalData.recentSessions[i]
      const gameLaunch = session.gameLaunches.find(launch => launch.gameId === gameId)
      if (gameLaunch) {
        return gameLaunch.timestamp
      }
    }
    
    return null
  }

  // Format last played time
  formatLastPlayed(gameId: string): string {
    const timestamp = this.getLastPlayedTimestamp(gameId)
    const avoidanceDays = this.getAvoidanceDays(gameId)
    
    if (!timestamp || avoidanceDays === 0) {
      return avoidanceDays === 0 ? 'Today' : 'Never'
    }
    
    if (avoidanceDays === 1) {
      return 'Yesterday'
    } else if (avoidanceDays < 7) {
      return `${avoidanceDays} days ago`
    } else if (avoidanceDays < 30) {
      const weeks = Math.floor(avoidanceDays / 7)
      return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`
    } else {
      const months = Math.floor(avoidanceDays / 30)
      return months === 1 ? '1 month ago' : `${months} months ago`
    }
  }

  // Get best score for a game (when available)
  getBestScore(gameId: string): number | null {
    const globalData = this.behaviorTracker.getGlobalData()
    
    switch (gameId) {
      case 'snake':
        return globalData.snakeBestScore > 0 ? globalData.snakeBestScore : null
      // TODO: Add other games when their best scores are tracked
      default:
        return null
    }
  }

  // Debug method to check data persistence
  debugGlobalData(): void {
    const data = this.behaviorTracker.getGlobalData();
    console.log('=== GLOBAL AI MEMORY DEBUG ===');
    console.log('Total Sessions:', data.totalSessions);
    console.log('Game Launch Counts:', data.gameLaunchCounts);
    console.log('Consecutive Replays:', data.consecutiveReplays);
    console.log('Current Replay Streak:', data.currentStreak);
    console.log('Last Played Game:', data.lastPlayedGame);
    console.log('Last Played Timestamp:', data.lastPlayedTimestamp);
    console.log('Is First Time:', this.isFirstTimeUser());
    console.log('===============================');
  }
}