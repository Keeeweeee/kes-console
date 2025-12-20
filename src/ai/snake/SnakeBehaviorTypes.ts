// Snake-specific behavior analysis types

export interface SnakeMove {
  timestamp: number;
  direction: string;
  snakeLength: number;
  distanceToFood: number;
  nearWall: boolean;
  position: { x: number; y: number };
  reactionTime: number;
  wallDistance: number; // Distance to nearest wall
  turnAngle: number; // 0=straight, 90=turn, 180=reverse
}

export interface SnakeSession {
  sessionId: string;
  startTime: number;
  endTime?: number;
  moves: SnakeMove[];
  score: number;
  deathCause: 'wall' | 'self' | 'block' | null;
  restartCount: number;
  punishmentsTriggered: PunishmentRecord[];
}

export interface PunishmentRecord {
  type: PunishmentType;
  timestamp: number;
  reason: string;
  severity: number; // 0-1
  playerBehavior: string;
}

export enum PunishmentType {
  FAKE_FOOD = 'fake_food',
  SPEED_INCREASE = 'speed_increase',
  WALL_FOOD_BIAS = 'wall_food_bias',
  BODY_FOOD_BIAS = 'body_food_bias',
  PATH_PREDICTION = 'path_prediction',
  SAFE_SPACE_REDUCTION = 'safe_space_reduction'
}

export enum CorruptionLevel {
  OBSERVATION = 0,
  SUBTLE_INTERFERENCE = 1,
  ACTIVE_MANIPULATION = 2,
  HOSTILE_TAKEOVER = 3
}

export interface SnakeBehaviorMetrics {
  // Core metrics (REAL, CONTINUOUS)
  wallHuggingFrequency: number; // 0-1, time spent within 1 tile of wall
  turnBias: { left: number; right: number; up: number; down: number }; // Direction repetition
  spiralBehaviorDetected: boolean; // Circular movement patterns
  averageReactionTime: number; // Response delay in ms
  lengthBasedGreedThreshold: number; // Snake length vs survival time ratio
  
  // Pattern analysis
  patternRepetition: number; // 0-1, how predictable movements are
  comfortZoneSize: number; // Average safe area player maintains
  riskTolerance: number; // 0-1, willingness to take dangerous moves
  
  // Performance tracking
  improvementTrend: number; // -1 to 1, getting better or worse
  totalSessions: number;
  totalDeaths: number;
  bestScore: number;
  averageScore: number;
  
  // Punishment tracking
  punishmentResistance: number; // 0-1, how well player adapts to punishment
  lastPunishmentResponse: number; // -1 to 1, performance change after punishment
}

export enum PlayerBehaviorType {
  CAUTIOUS = 'cautious',
  GREEDY = 'greedy', 
  ERRATIC = 'erratic',
  PREDICTABLE = 'predictable',
  IMPROVING = 'improving',
  WALL_HUGGER = 'wall_hugger',
  SPIRAL_ADDICT = 'spiral_addict'
}

export interface CommentaryTrigger {
  type: 'game_start' | 'death' | 'repeated_failure' | 'improvement' | 'punishment_activated' | 'behavior_detected' | 'corruption_level_change' | 'fake_food_spawn' | 'speed_escalation' | 'mid_game_taunt';
  context: {
    score?: number;
    deathCause?: string;
    sessionCount?: number;
    behaviorType?: PlayerBehaviorType;
    punishmentType?: PunishmentType;
    detectedBehavior?: string;
    punishmentReason?: string;
    corruptionLevel?: CorruptionLevel;
    fakeFoodReason?: string;
    speedChange?: number;
  };
}

export interface PunishmentState {
  corruptionLevel: CorruptionLevel;
  corruptionStartTime: number;
  fakeFood: {
    active: boolean;
    position: { x: number; y: number } | null;
    triggerReason: string;
    flickerState: boolean;
    lastFlicker: number;
  };
  environmentalBlocks: { x: number; y: number }[];
  lastBlockSpawn: number;
  foodEatenSinceLastBlock: number;
  speedMultiplier: number; // 1.0 = normal, >1.0 = faster
  speedSurgeActive: boolean;
  speedFluctuationActive: boolean;
  foodBias: {
    wallBias: number; // 0-1, probability of spawning near walls
    bodyBias: number; // 0-1, probability of spawning near snake body
    safeSpaceReduction: number; // 0-1, reduction in safe spawn radius
  };
  pathPrediction: {
    active: boolean;
    predictedPath: { x: number; y: number }[];
    biasStrength: number; // 0-1, how strongly to bias food into predicted path
  };
  environmentalEffects: {
    colorShift: number; // 0-1, how much to shift colors
    gridTension: boolean; // Minor shake at level 3
    foodPulseRate: number; // Changes in food pulse animation
  };
}