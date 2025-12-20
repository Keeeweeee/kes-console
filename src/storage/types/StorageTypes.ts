// Storage Types - Data structures for user behavior and persistence

export enum GameType {
  SNAKE = 'snake',
  MINESWEEPER = 'minesweeper', 
  PACMAN = 'pacman',
  BLOCKBREAKER = 'blockbreaker'
}

export enum InteractionType {
  CLICK = 'click',
  KEYPRESS = 'keypress',
  NAVIGATION = 'navigation',
  GAME_ACTION = 'game_action'
}

export interface UserInteraction {
  id: string
  timestamp: Date
  type: InteractionType
  context: string
  gameType?: GameType
  metadata: Record<string, any>
}

export interface GameSession {
  sessionId: string
  gameType: GameType
  startTime: Date
  endTime?: Date
  score: number
  duration: number
  completionStatus: 'completed' | 'abandoned' | 'failed'
  interactions: UserInteraction[]
}

export interface UserBehaviorProfile {
  userId: string
  createdAt: Date
  lastUpdated: Date
  totalSessions: number
  gamePreferences: Record<GameType, number>
  skillLevels: Record<GameType, string>
  behaviorPatterns: Record<string, any>
  aiPersonalization: Record<string, any>
}