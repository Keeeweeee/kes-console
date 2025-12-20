// Console-level behavior tracking types

export interface GameLaunchEvent {
  gameId: string;
  timestamp: number;
  sessionDuration?: number; // Will be filled when session ends
}

export interface ConsoleSession {
  sessionId: string;
  startTime: number;
  endTime?: number;
  gameLaunches: GameLaunchEvent[];
  totalTimeSpent: number;
}

export interface GlobalGameStats {
  gameId: string;
  timesSelected: number;
  timesPlayed: number;
  lastPlayedAt: number;
  lastSelectedAt: number;
  lastKnownLevel?: number;
  failCount?: number;
}

export interface GlobalAIProfile {
  totalSessions: number;
  lastPlayedGameId: string | null;
  selectionStreak: {
    gameId: string;
    count: number;
  };
  perGameStats: Record<string, GlobalGameStats>;
}

export interface GlobalBehaviorData {
  // Game launch tracking - ONLY mutated on actual launches
  gameLaunchCounts: Record<string, number>; // gameId -> total launches
  lastPlayedGame: string | null;
  lastPlayedTimestamp: number | null;
  
  // First launch tracking for accurate "first time" detection
  firstLaunchedAt: Record<string, number>; // gameId -> timestamp of first launch
  
  // Consecutive behavior tracking - ONLY based on launches, not selections
  consecutiveReplays: Record<string, number>; // gameId -> consecutive launches
  currentStreak: { gameId: string; count: number } | null;
  
  // Avoidance tracking - based on lastPlayedTimestamp, not selections
  gameAvoidanceDays: Record<string, number>; // gameId -> days since last played
  totalSessions: number;
  
  // Failure tracking (from Snake for now)
  snakeFailStreaks: number;
  snakeLastScore: number;
  snakeBestScore: number;
  
  // Session history (keep last 20 sessions)
  recentSessions: ConsoleSession[];
  
  // First time user detection
  isFirstTime: boolean;
  accountCreated: number;
}

export enum ConsoleCommentaryTrigger {
  APP_LOAD = 'app_load',
  GAME_SELECTION = 'game_selection',
  GAME_LAUNCH = 'game_launch',
  REPEATED_SELECTION = 'repeated_selection',
  GAME_AVOIDANCE = 'game_avoidance',
  FAILURE_ESCAPE = 'failure_escape',
  SELECTION_SWITCH = 'selection_switch'
}

export interface ConsoleCommentaryContext {
  trigger: ConsoleCommentaryTrigger;
  gameId?: string;
  consecutiveCount?: number;
  avoidanceDays?: number;
  failureCount?: number;
  sessionCount?: number;
}