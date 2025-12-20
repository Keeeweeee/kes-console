// Block Breaker AI - Behavior tracking types for performance analysis

export interface BlockBreakerBehaviorData {
  // Miss tracking
  missedBallLocations: Array<{ x: number; y: number; timestamp: number }>
  paddleReactionTimes: number[]
  failureZones: Map<string, number> // zone -> miss count
  rallyLengths: number[] // hits per rally
  
  // Performance metrics
  totalMisses: number
  averageReactionTime: number
  mostFailedZone: string | null
  averageRallyLength: number
  
  // Session data
  gamesPlayed: number
  bestScore: number
  consecutiveMisses: number
  improvementTrend: 'improving' | 'declining' | 'stable'
}

export interface BlockBreakerGameEvent {
  type: 'ball_missed' | 'paddle_hit' | 'block_hit' | 'game_start' | 'game_end'
  timestamp: number
  data?: {
    ballPosition?: { x: number; y: number }
    paddlePosition?: number
    reactionTime?: number
    blocksRemaining?: number
    score?: number
  }
}

export interface BlockBreakerPerformanceMetrics {
  // Real-time tracking
  currentRallyLength: number
  lastMissLocation: { x: number; y: number } | null
  lastReactionTime: number
  
  // Pattern detection
  repeatedFailureZone: string | null
  failureZoneCount: number
  isImproving: boolean
  
  // Commentary triggers
  shouldCommentOnMiss: boolean
  shouldCommentOnImprovement: boolean
  shouldEscalateSarcasm: boolean
}

// Zone classification for miss analysis
export const FAILURE_ZONES = {
  LEFT_EDGE: 'left_edge',
  RIGHT_EDGE: 'right_edge',
  CENTER: 'center',
  LEFT_SIDE: 'left_side',
  RIGHT_SIDE: 'right_side'
} as const

export type FailureZone = typeof FAILURE_ZONES[keyof typeof FAILURE_ZONES]

export function classifyMissZone(ballX: number, gameWidth: number): FailureZone {
  const normalizedX = ballX / gameWidth
  
  if (normalizedX < 0.1) return FAILURE_ZONES.LEFT_EDGE
  if (normalizedX > 0.9) return FAILURE_ZONES.RIGHT_EDGE
  if (normalizedX >= 0.4 && normalizedX <= 0.6) return FAILURE_ZONES.CENTER
  if (normalizedX < 0.4) return FAILURE_ZONES.LEFT_SIDE
  return FAILURE_ZONES.RIGHT_SIDE
}