// Minesweeper-specific behavior analysis types

export interface TileAdvice {
  row: number;
  col: number;
  probability: number;
  aiSuggestion: 'safe' | 'dangerous' | 'uncertain';
  isDeceptive: boolean; // Whether AI is lying about this tile
  confidence: number; // 0-1, how confident the AI sounds
}

export interface MinesweeperMove {
  timestamp: number;
  row: number;
  col: number;
  action: 'click' | 'flag';
  followedAIAdvice: boolean;
  aiAdviceGiven?: TileAdvice;
  result: 'safe' | 'mine' | 'flag_correct' | 'flag_incorrect';
}

export interface MinesweeperSession {
  sessionId: string;
  startTime: number;
  endTime?: number;
  moves: MinesweeperMove[];
  gameResult: 'won' | 'lost' | 'abandoned';
  trustLevel: number; // 0-1, how much player trusts AI
  deceptionCount: number; // How many times AI lied this session
  adviceFollowedCount: number; // How many times player followed advice
  rageQuitDetected: boolean;
  lossContext?: 'advice_followed' | 'advice_ignored' | 'no_advice'; // How the player lost
}

export interface MinesweeperBehaviorMetrics {
  totalSessions: number;
  averageTrustLevel: number;
  deceptionSuccessRate: number; // How often deception works
  adviceFollowRate: number; // How often player follows advice
  rageQuitFrequency: number;
  averageSessionDuration: number;
  winRate: number;
  totalDeceptions: number;
  totalAdviceGiven: number;
}

export enum MinesweeperCommentaryTrigger {
  GAME_START = 'game_start',
  TILE_HOVER = 'tile_hover',
  ADVICE_IGNORED = 'advice_ignored',
  ADVICE_FOLLOWED = 'advice_followed',
  DECEPTION_SUCCESS = 'deception_success',
  RAGE_QUIT = 'rage_quit',
  GAME_END = 'game_end'
}

export interface MinesweeperCommentaryContext {
  trigger: MinesweeperCommentaryTrigger;
  tilePosition?: { row: number; col: number };
  probability?: number;
  trustLevel?: number;
  deceptionCount?: number;
  gameResult?: 'won' | 'lost' | 'abandoned';
  lossContext?: 'advice_followed' | 'advice_ignored' | 'no_advice';
}