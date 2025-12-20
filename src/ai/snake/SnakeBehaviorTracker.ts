// Snake Behavior Tracker - Analyzes player behavior patterns with adaptive punishment

import { 
  SnakeMove, 
  SnakeSession, 
  SnakeBehaviorMetrics, 
  PlayerBehaviorType,
  PunishmentRecord,
  PunishmentType
} from './SnakeBehaviorTypes';

export class SnakeBehaviorTracker {
  private currentSession: SnakeSession | null = null;
  private sessions: SnakeSession[] = [];
  private lastMoveTime = 0;
  private sessionCounter = 0;
  private lastDirection = '';
  private directionHistory: string[] = [];
  private wallTimeAccumulator = 0;
  private totalGameTime = 0;

  // Persistent cross-session data
  private persistentData = {
    totalWallHuggingTime: 0,
    totalGameTime: 0,
    directionCounts: { UP: 0, DOWN: 0, LEFT: 0, RIGHT: 0 },
    spiralPatterns: 0,
    comfortZoneViolations: 0,
    punishmentAdaptations: 0
  };

  startSession(): string {
    const sessionId = `snake_${Date.now()}_${++this.sessionCounter}`;
    this.currentSession = {
      sessionId,
      startTime: Date.now(),
      moves: [],
      score: 0,
      deathCause: null,
      restartCount: this.sessions.length,
      punishmentsTriggered: []
    };
    this.wallTimeAccumulator = 0;
    this.totalGameTime = 0;
    this.directionHistory = [];
    return sessionId;
  }

  recordMove(
    direction: string, 
    snakeHead: { x: number; y: number },
    snakeLength: number,
    foodPosition: { x: number; y: number },
    gridWidth: number,
    gridHeight: number
  ): void {
    if (!this.currentSession) return;

    const now = Date.now();
    const reactionTime = this.lastMoveTime > 0 ? now - this.lastMoveTime : 0;
    const distanceToFood = Math.abs(snakeHead.x - foodPosition.x) + Math.abs(snakeHead.y - foodPosition.y);
    
    // Calculate wall distance (minimum distance to any wall)
    const wallDistance = Math.min(
      snakeHead.x, // Distance to left wall
      snakeHead.y, // Distance to top wall
      gridWidth - 1 - snakeHead.x, // Distance to right wall
      gridHeight - 1 - snakeHead.y // Distance to bottom wall
    );
    
    const nearWall = wallDistance <= 1;
    
    // Calculate turn angle
    const turnAngle = this.calculateTurnAngle(this.lastDirection, direction);
    
    const move: SnakeMove = {
      timestamp: now,
      direction,
      snakeLength,
      distanceToFood,
      nearWall,
      position: { ...snakeHead },
      reactionTime,
      wallDistance,
      turnAngle
    };

    this.currentSession.moves.push(move);
    
    // Update continuous tracking
    this.updateContinuousMetrics(move, now);
    
    this.lastMoveTime = now;
    this.lastDirection = direction;
  }

  private updateContinuousMetrics(move: SnakeMove, now: number): void {
    // Track wall hugging time
    if (move.nearWall) {
      const timeDelta = this.lastMoveTime > 0 ? now - this.lastMoveTime : 0;
      this.wallTimeAccumulator += timeDelta;
      this.persistentData.totalWallHuggingTime += timeDelta;
    }
    
    // Update total game time
    if (this.lastMoveTime > 0) {
      const timeDelta = now - this.lastMoveTime;
      this.totalGameTime += timeDelta;
      this.persistentData.totalGameTime += timeDelta;
    }
    
    // Track direction bias
    if (move.direction in this.persistentData.directionCounts) {
      this.persistentData.directionCounts[move.direction as keyof typeof this.persistentData.directionCounts]++;
    }
    
    // Track direction history for pattern detection
    this.directionHistory.push(move.direction);
    if (this.directionHistory.length > 20) {
      this.directionHistory = this.directionHistory.slice(-20);
    }
    
    // Detect spiral behavior
    if (this.directionHistory.length >= 8) {
      if (this.detectSpiralPattern(this.directionHistory.slice(-8))) {
        this.persistentData.spiralPatterns++;
      }
    }
  }

  private calculateTurnAngle(lastDir: string, currentDir: string): number {
    if (!lastDir || lastDir === currentDir) return 0;
    
    const directions = ['UP', 'RIGHT', 'DOWN', 'LEFT'];
    const lastIndex = directions.indexOf(lastDir);
    const currentIndex = directions.indexOf(currentDir);
    
    if (lastIndex === -1 || currentIndex === -1) return 0;
    
    let diff = Math.abs(currentIndex - lastIndex);
    if (diff > 2) diff = 4 - diff; // Handle wrap-around
    
    return diff * 90; // Convert to degrees
  }

  private detectSpiralPattern(recentMoves: string[]): boolean {
    // Look for repeating 4-direction cycles (clockwise or counterclockwise)
    const clockwise = ['UP', 'RIGHT', 'DOWN', 'LEFT'];
    const counterclockwise = ['UP', 'LEFT', 'DOWN', 'RIGHT'];
    
    // Check for partial or complete spiral patterns
    for (let start = 0; start < 4; start++) {
      const clockwisePattern = [...clockwise.slice(start), ...clockwise.slice(0, start)];
      const counterclockwisePattern = [...counterclockwise.slice(start), ...counterclockwise.slice(0, start)];
      
      if (this.matchesPattern(recentMoves, clockwisePattern) || 
          this.matchesPattern(recentMoves, counterclockwisePattern)) {
        return true;
      }
    }
    
    return false;
  }

  private matchesPattern(moves: string[], pattern: string[]): boolean {
    if (moves.length < pattern.length) return false;
    
    for (let i = 0; i <= moves.length - pattern.length; i++) {
      let matches = true;
      for (let j = 0; j < pattern.length; j++) {
        if (moves[i + j] !== pattern[j]) {
          matches = false;
          break;
        }
      }
      if (matches) return true;
    }
    
    return false;
  }

  recordPunishment(type: PunishmentType, reason: string, severity: number, playerBehavior: string): void {
    if (!this.currentSession) return;
    
    this.currentSession.punishmentsTriggered.push({
      type,
      timestamp: Date.now(),
      reason,
      severity,
      playerBehavior
    });
  }

  endSession(score: number, deathCause: 'wall' | 'self' | 'block' | null): void {
    if (!this.currentSession) return;

    this.currentSession.endTime = Date.now();
    this.currentSession.score = score;
    this.currentSession.deathCause = deathCause;

    this.sessions.push(this.currentSession);
    
    // Keep only last 10 sessions to prevent memory bloat
    if (this.sessions.length > 10) {
      this.sessions = this.sessions.slice(-10);
    }

    this.currentSession = null;
  }

  calculateMetrics(): SnakeBehaviorMetrics {
    const recentSessions = this.sessions.slice(-5); // Last 5 sessions
    const allMoves = recentSessions.flatMap(s => s.moves);

    // REAL, CONTINUOUS METRICS
    
    // 1. Wall hugging frequency (time spent within 1 tile of wall)
    const wallHuggingFrequency = this.persistentData.totalGameTime > 0 
      ? this.persistentData.totalWallHuggingTime / this.persistentData.totalGameTime 
      : 0;

    // 2. Turn bias (direction repetition)
    const totalDirections = Object.values(this.persistentData.directionCounts).reduce((a, b) => a + b, 0);
    const turnBias = {
      left: totalDirections > 0 ? this.persistentData.directionCounts.LEFT / totalDirections : 0,
      right: totalDirections > 0 ? this.persistentData.directionCounts.RIGHT / totalDirections : 0,
      up: totalDirections > 0 ? this.persistentData.directionCounts.UP / totalDirections : 0,
      down: totalDirections > 0 ? this.persistentData.directionCounts.DOWN / totalDirections : 0
    };

    // 3. Spiral behavior detection
    const spiralBehaviorDetected = this.persistentData.spiralPatterns > this.sessions.length * 0.3;

    // 4. Average reaction delay
    const reactionTimes = allMoves
      .filter(m => m.reactionTime > 0 && m.reactionTime < 2000)
      .map(m => m.reactionTime);
    const averageReactionTime = reactionTimes.length > 0 
      ? reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length 
      : 0;

    // 5. Length-based greed threshold (snake length vs survival time)
    const lengthBasedGreedThreshold = this.calculateGreedThreshold(recentSessions);

    // Pattern analysis
    const directions = allMoves.map(m => m.direction);
    const patterns = this.findRepeatingPatterns(directions);
    const patternRepetition = directions.length > 0 ? patterns.length / directions.length : 0;

    // Comfort zone analysis
    const comfortZoneSize = this.calculateComfortZoneSize(allMoves);
    const riskTolerance = this.calculateRiskTolerance(allMoves);

    // Performance tracking
    const scores = this.sessions.map(s => s.score);
    const improvementTrend = this.calculateTrend(scores);

    // Punishment tracking
    const punishmentResistance = this.calculatePunishmentResistance();
    const lastPunishmentResponse = this.calculateLastPunishmentResponse();

    return {
      // Core metrics (REAL, CONTINUOUS)
      wallHuggingFrequency,
      turnBias,
      spiralBehaviorDetected,
      averageReactionTime,
      lengthBasedGreedThreshold,
      
      // Pattern analysis
      patternRepetition,
      comfortZoneSize,
      riskTolerance,
      
      // Performance tracking
      improvementTrend,
      totalSessions: this.sessions.length,
      totalDeaths: this.sessions.filter(s => s.deathCause).length,
      bestScore: Math.max(...scores, 0),
      averageScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
      
      // Punishment tracking
      punishmentResistance,
      lastPunishmentResponse
    };
  }

  private calculateGreedThreshold(sessions: SnakeSession[]): number {
    if (sessions.length === 0) return 0;
    
    let totalLengthTimeRatio = 0;
    let validSessions = 0;
    
    for (const session of sessions) {
      if (session.endTime && session.moves.length > 0) {
        const maxLength = Math.max(...session.moves.map(m => m.snakeLength));
        const survivalTime = session.endTime - session.startTime;
        const ratio = maxLength / (survivalTime / 1000); // Length per second
        totalLengthTimeRatio += ratio;
        validSessions++;
      }
    }
    
    return validSessions > 0 ? totalLengthTimeRatio / validSessions : 0;
  }

  private calculateComfortZoneSize(moves: SnakeMove[]): number {
    if (moves.length === 0) return 0;
    
    // Calculate average distance from walls
    const avgWallDistance = moves.reduce((sum, move) => sum + move.wallDistance, 0) / moves.length;
    
    // Normalize to 0-1 scale (assuming max grid size of 20)
    return Math.min(avgWallDistance / 10, 1);
  }

  private calculateRiskTolerance(moves: SnakeMove[]): number {
    if (moves.length === 0) return 0;
    
    // Count risky moves (close to walls or sharp turns when near walls)
    const riskyMoves = moves.filter(move => 
      move.wallDistance <= 2 || (move.nearWall && move.turnAngle >= 90)
    ).length;
    
    return moves.length > 0 ? riskyMoves / moves.length : 0;
  }

  private calculatePunishmentResistance(): number {
    if (this.sessions.length < 2) return 0;
    
    // Measure how well player adapts after punishments
    let adaptationScore = 0;
    let punishmentCount = 0;
    
    for (const session of this.sessions) {
      if (session.punishmentsTriggered.length > 0) {
        punishmentCount++;
        // Simple heuristic: if score improved after punishment, player adapted
        const nextSession = this.sessions[this.sessions.indexOf(session) + 1];
        if (nextSession && nextSession.score > session.score) {
          adaptationScore++;
        }
      }
    }
    
    return punishmentCount > 0 ? adaptationScore / punishmentCount : 0;
  }

  private calculateLastPunishmentResponse(): number {
    if (this.sessions.length < 2) return 0;
    
    // Find last session with punishment
    for (let i = this.sessions.length - 1; i >= 0; i--) {
      const session = this.sessions[i];
      if (session.punishmentsTriggered.length > 0) {
        const nextSession = this.sessions[i + 1];
        if (nextSession) {
          // Compare performance before and after punishment
          const scoreDiff = nextSession.score - session.score;
          return Math.max(-1, Math.min(1, scoreDiff / 50)); // Normalize to -1 to 1
        }
        break;
      }
    }
    
    return 0;
  }

  classifyBehavior(): PlayerBehaviorType {
    const metrics = this.calculateMetrics();

    if (metrics.totalSessions < 2) {
      return PlayerBehaviorType.CAUTIOUS;
    }

    // Wall hugger: spends significant time near walls
    if (metrics.wallHuggingFrequency > 0.6) {
      return PlayerBehaviorType.WALL_HUGGER;
    }

    // Spiral addict: detected spiral patterns
    if (metrics.spiralBehaviorDetected) {
      return PlayerBehaviorType.SPIRAL_ADDICT;
    }

    // Improving: positive trend and decent performance
    if (metrics.improvementTrend > 0.3 && metrics.averageScore > 20) {
      return PlayerBehaviorType.IMPROVING;
    }

    // Greedy: high length-based greed threshold
    if (metrics.lengthBasedGreedThreshold > 0.5 && metrics.totalDeaths > metrics.totalSessions * 0.7) {
      return PlayerBehaviorType.GREEDY;
    }

    // Erratic: high reaction time variance and low comfort zone
    if (metrics.averageReactionTime > 800 && metrics.comfortZoneSize < 0.3) {
      return PlayerBehaviorType.ERRATIC;
    }

    // Predictable: high pattern repetition and strong turn bias
    const maxTurnBias = Math.max(
      metrics.turnBias.left, 
      metrics.turnBias.right, 
      metrics.turnBias.up, 
      metrics.turnBias.down
    );
    if (metrics.patternRepetition > 0.4 && maxTurnBias > 0.4) {
      return PlayerBehaviorType.PREDICTABLE;
    }

    // Default to cautious
    return PlayerBehaviorType.CAUTIOUS;
  }

  // Punishment detection methods
  shouldTriggerFakeFood(): { should: boolean; reason: string } {
    const metrics = this.calculateMetrics();
    
    // Trigger if player is too safe (high comfort zone, low risk tolerance)
    if (metrics.comfortZoneSize > 0.7 && metrics.riskTolerance < 0.2) {
      return { 
        should: true, 
        reason: `Comfort zone detected: ${(metrics.comfortZoneSize * 100).toFixed(0)}% safe distance maintained` 
      };
    }
    
    return { should: false, reason: '' };
  }

  shouldIncreaseSpeed(): { should: boolean; reason: string; multiplier: number } {
    const metrics = this.calculateMetrics();
    
    // Trigger if player shows greed after establishing comfort
    if (metrics.lengthBasedGreedThreshold > 0.4 && metrics.comfortZoneSize > 0.6) {
      const multiplier = 1 + (metrics.lengthBasedGreedThreshold * 0.5); // Max 1.5x speed
      return { 
        should: true, 
        reason: `Greed detected: ${(metrics.lengthBasedGreedThreshold * 100).toFixed(0)}% length/time ratio`, 
        multiplier 
      };
    }
    
    return { should: false, reason: '', multiplier: 1 };
  }

  shouldBiasFoodToWalls(): { should: boolean; reason: string; bias: number } {
    const metrics = this.calculateMetrics();
    
    // Trigger if player grows greedy but avoids walls
    if (metrics.lengthBasedGreedThreshold > 0.3 && metrics.wallHuggingFrequency < 0.2) {
      const bias = Math.min(0.8, metrics.lengthBasedGreedThreshold); // Max 80% wall bias
      return { 
        should: true, 
        reason: `Greed with wall avoidance: ${(metrics.lengthBasedGreedThreshold * 100).toFixed(0)}% greed, ${(metrics.wallHuggingFrequency * 100).toFixed(0)}% wall time`, 
        bias 
      };
    }
    
    return { should: false, reason: '', bias: 0 };
  }

  shouldPredictPath(): { should: boolean; reason: string; strength: number } {
    const metrics = this.calculateMetrics();
    
    // Trigger if player is highly predictable
    const maxTurnBias = Math.max(
      metrics.turnBias.left, 
      metrics.turnBias.right, 
      metrics.turnBias.up, 
      metrics.turnBias.down
    );
    
    if (metrics.patternRepetition > 0.5 || maxTurnBias > 0.5) {
      const strength = Math.max(metrics.patternRepetition, maxTurnBias);
      return { 
        should: true, 
        reason: `Predictable behavior: ${(metrics.patternRepetition * 100).toFixed(0)}% patterns, ${(maxTurnBias * 100).toFixed(0)}% turn bias`, 
        strength 
      };
    }
    
    return { should: false, reason: '', strength: 0 };
  }

  getSessionCount(): number {
    return this.sessions.length;
  }

  getLastScore(): number {
    return this.sessions.length > 0 ? this.sessions[this.sessions.length - 1].score : 0;
  }

  getLastDeathCause(): 'wall' | 'self' | 'block' | null {
    return this.sessions.length > 0 ? this.sessions[this.sessions.length - 1].deathCause : null;
  }

  private findRepeatingPatterns(directions: string[]): string[] {
    const patterns: string[] = [];
    for (let i = 0; i < directions.length - 3; i++) {
      const pattern = directions.slice(i, i + 3).join('');
      const remaining = directions.slice(i + 3).join('');
      if (remaining.includes(pattern)) {
        patterns.push(pattern);
      }
    }
    return patterns;
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 3) return 0;
    
    const recent = values.slice(-3);
    const older = values.slice(-6, -3);
    
    if (older.length === 0) return 0;
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    
    return Math.max(-1, Math.min(1, (recentAvg - olderAvg) / Math.max(olderAvg, 10)));
  }
}