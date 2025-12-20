// Console-level behavior tracker - Tracks cross-game behavior patterns

import { 
  GlobalBehaviorData, 
  ConsoleSession, 
  GameLaunchEvent 
} from './ConsoleBehaviorTypes';
import { GlobalMemoryStore } from './storage/GlobalMemoryStore';
import { LocalMemoryStore } from './storage/LocalMemoryStore';
import { HttpMemoryStore } from './storage/HttpMemoryStore';

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export class ConsoleBehaviorTracker {
  private data: GlobalBehaviorData;
  private memoryStore: GlobalMemoryStore;
  private currentSession: ConsoleSession | null = null;
  private sessionCounter = 0;

  constructor(memoryStore?: GlobalMemoryStore) {
    // Use provided store, or select based on environment configuration
    this.memoryStore = memoryStore || this.createDefaultStore();
    this.data = this.createEmptyData();
  }

  private createDefaultStore(): GlobalMemoryStore {
    // Check for API Gateway endpoint configuration
    const apiEndpoint = import.meta.env.VITE_AI_MEMORY_ENDPOINT;
    
    if (apiEndpoint) {
      console.log('Using HttpMemoryStore with endpoint:', apiEndpoint);
      return new HttpMemoryStore(apiEndpoint);
    }
    
    // Default to LocalMemoryStore
    console.log('Using LocalMemoryStore (no API endpoint configured)');
    return new LocalMemoryStore();
  }

  // Initialize data from storage (async)
  async initialize(): Promise<void> {
    try {
      const stored = await this.memoryStore.load();
      
      if (stored) {
        // Update avoidance days on load
        this.updateAvoidanceDays(stored);
        // Ensure new fields exist for backward compatibility
        if (!stored.firstLaunchedAt) stored.firstLaunchedAt = {};
        // Remove selection-based fields that cause preview contamination
        delete (stored as any).gameSelectionCounts;
        delete (stored as any).consecutiveSelections;
        delete (stored as any).lastSelectedGame;
        delete (stored as any).lastSelectedTimestamp;
        delete (stored as any).currentSelectionStreak;
        
        this.data = stored;
      } else {
        this.data = this.createEmptyData();
      }
    } catch (error) {
      console.error('Failed to initialize memory store, using empty data:', error);
      this.data = this.createEmptyData();
    }
  }

  private createEmptyData(): GlobalBehaviorData {
    return {
      gameLaunchCounts: {},
      lastPlayedGame: null,
      lastPlayedTimestamp: null,
      firstLaunchedAt: {},
      consecutiveReplays: {},
      currentStreak: null,
      gameAvoidanceDays: {},
      totalSessions: 0,
      snakeFailStreaks: 0,
      snakeLastScore: 0,
      snakeBestScore: 0,
      recentSessions: [],
      isFirstTime: true,
      accountCreated: Date.now()
    };
  }

  private updateAvoidanceDays(data: GlobalBehaviorData): void {
    const now = Date.now();
    const availableGames = ['snake', 'minesweeper', 'pacman', 'blockbreaker'];
    
    availableGames.forEach(gameId => {
      const lastPlayed = this.getLastPlayedTime(gameId, data);
      if (lastPlayed) {
        const daysSince = Math.floor((now - lastPlayed) / MILLISECONDS_PER_DAY);
        data.gameAvoidanceDays[gameId] = daysSince;
      } else {
        // Never played
        const daysSinceAccountCreated = Math.floor((now - data.accountCreated) / MILLISECONDS_PER_DAY);
        data.gameAvoidanceDays[gameId] = daysSinceAccountCreated;
      }
    });
  }

  private getLastPlayedTime(gameId: string, data: GlobalBehaviorData): number | null {
    // Find the most recent session that launched this game
    for (let i = data.recentSessions.length - 1; i >= 0; i--) {
      const session = data.recentSessions[i];
      const gameLaunch = session.gameLaunches.find(launch => launch.gameId === gameId);
      if (gameLaunch) {
        return gameLaunch.timestamp;
      }
    }
    return null;
  }

  private async saveData(): Promise<void> {
    try {
      await this.memoryStore.save(this.data);
    } catch (error) {
      console.error('Failed to save memory data:', error);
    }
  }

  startSession(): string {
    const sessionId = `console_${Date.now()}_${++this.sessionCounter}`;
    this.currentSession = {
      sessionId,
      startTime: Date.now(),
      gameLaunches: [],
      totalTimeSpent: 0
    };
    
    this.data.totalSessions++;
    this.data.isFirstTime = false;
    return sessionId;
  }

  // ONLY METHOD THAT MUTATES MEMORY FOR GAME LAUNCHES
  recordGameLaunch(gameId: string): void {
    if (!this.currentSession) return;

    const now = Date.now();
    
    // Record the launch
    const launchEvent: GameLaunchEvent = {
      gameId,
      timestamp: now
    };
    
    this.currentSession.gameLaunches.push(launchEvent);
    
    // Update global counters - ONLY on actual launches
    const previousLaunchCount = this.data.gameLaunchCounts[gameId] || 0;
    this.data.gameLaunchCounts[gameId] = previousLaunchCount + 1;
    this.data.lastPlayedGame = gameId;
    this.data.lastPlayedTimestamp = now;
    
    // Set first launch timestamp only once
    if (previousLaunchCount === 0) {
      this.data.firstLaunchedAt[gameId] = now;
    }
    
    // Update consecutive replay tracking - ONLY based on launches
    if (this.data.currentStreak?.gameId === gameId) {
      this.data.currentStreak.count++;
      this.data.consecutiveReplays[gameId] = this.data.currentStreak.count;
    } else {
      // Reset previous streak
      if (this.data.currentStreak) {
        this.data.consecutiveReplays[this.data.currentStreak.gameId] = 0;
      }
      // Start new streak
      this.data.currentStreak = { gameId, count: 1 };
      this.data.consecutiveReplays[gameId] = 1;
    }
    
    // Reset avoidance for this game
    this.data.gameAvoidanceDays[gameId] = 0;
    
    // Recalculate avoidance days for all games to keep data fresh
    this.updateAvoidanceDays(this.data);
    
    // Save to persistent storage
    void this.saveData();
  }

  // ONLY METHOD THAT MUTATES MEMORY FOR SNAKE GAME END
  recordSnakeGameEnd(score: number, wasFailure: boolean): void {
    this.data.snakeLastScore = score;
    
    if (score > this.data.snakeBestScore) {
      this.data.snakeBestScore = score;
      this.data.snakeFailStreaks = 0; // Reset fail streak on new best
    } else if (wasFailure) {
      this.data.snakeFailStreaks++;
    } else {
      this.data.snakeFailStreaks = 0; // Reset on decent performance
    }
    
    // Save to persistent storage
    void this.saveData();
  }

  // ONLY METHOD THAT MUTATES MEMORY FOR SESSION END
  endSession(): void {
    if (!this.currentSession) return;

    this.currentSession.endTime = Date.now();
    this.currentSession.totalTimeSpent = this.currentSession.endTime - this.currentSession.startTime;
    
    // Add to recent sessions
    this.data.recentSessions.push(this.currentSession);
    
    // Keep only last 20 sessions
    if (this.data.recentSessions.length > 20) {
      this.data.recentSessions = this.data.recentSessions.slice(-20);
    }
    
    this.currentSession = null;
    
    // Save to persistent storage
    void this.saveData();
  }

  // READ-ONLY GETTERS - NO MEMORY MUTATION
  getGlobalData(): Readonly<GlobalBehaviorData> {
    return { ...this.data };
  }

  getGameLaunchCount(gameId: string): number {
    return this.data.gameLaunchCounts[gameId] || 0;
  }

  getConsecutiveReplays(gameId: string): number {
    return this.data.consecutiveReplays[gameId] || 0;
  }

  getAvoidanceDays(gameId: string): number {
    return this.data.gameAvoidanceDays[gameId] || 0;
  }

  getSnakeFailStreak(): number {
    return this.data.snakeFailStreaks;
  }

  isFirstTimeUser(): boolean {
    // Check if user has never launched any game using firstLaunchedAt
    return Object.keys(this.data.firstLaunchedAt).length === 0;
  }

  isFirstTimePlayingGame(gameId: string): boolean {
    // Check if this specific game has never been launched - ONLY based on launches
    return !this.data.firstLaunchedAt[gameId];
  }

  getTotalSessions(): number {
    return this.data.totalSessions;
  }

  getLastPlayedGame(): string | null {
    return this.data.lastPlayedGame;
  }

  // Check if user is avoiding a specific game - ONLY based on launch data
  isAvoidingGame(gameId: string): boolean {
    const avoidanceDays = this.getAvoidanceDays(gameId);
    const totalSessions = this.getTotalSessions();
    
    // Consider avoiding if:
    // - Haven't played in 3+ days AND have had 5+ sessions
    // - OR never played and have had 10+ sessions
    return (avoidanceDays >= 3 && totalSessions >= 5) || 
           (avoidanceDays >= totalSessions && totalSessions >= 10);
  }

  // Check if user just escaped from a failing game - ONLY based on launch data
  isEscapingFailure(newGameId: string): boolean {
    const lastGame = this.getLastPlayedGame();
    return lastGame === 'snake' && 
           newGameId !== 'snake' && 
           this.getSnakeFailStreak() >= 3;
  }
}