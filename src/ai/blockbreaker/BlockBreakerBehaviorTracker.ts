// Block Breaker AI - Behavior tracking and pattern analysis

import { 
  BlockBreakerBehaviorData, 
  BlockBreakerGameEvent, 
  BlockBreakerPerformanceMetrics,
  classifyMissZone,
  FailureZone
} from './BlockBreakerBehaviorTypes'

export class BlockBreakerBehaviorTracker {
  private behaviorData: BlockBreakerBehaviorData
  private currentMetrics: BlockBreakerPerformanceMetrics
  private lastPaddleHitTime: number = 0
  private gameWidth: number = 800 // Default, will be updated

  constructor() {
    this.behaviorData = {
      missedBallLocations: [],
      paddleReactionTimes: [],
      failureZones: new Map(),
      rallyLengths: [],
      totalMisses: 0,
      averageReactionTime: 0,
      mostFailedZone: null,
      averageRallyLength: 0,
      gamesPlayed: 0,
      bestScore: 0,
      consecutiveMisses: 0,
      improvementTrend: 'stable'
    }

    this.currentMetrics = {
      currentRallyLength: 0,
      lastMissLocation: null,
      lastReactionTime: 0,
      repeatedFailureZone: null,
      failureZoneCount: 0,
      isImproving: false,
      shouldCommentOnMiss: false,
      shouldCommentOnImprovement: false,
      shouldEscalateSarcasm: false
    }
  }

  setGameDimensions(width: number): void {
    this.gameWidth = width
  }

  trackEvent(event: BlockBreakerGameEvent): void {
    switch (event.type) {
      case 'game_start':
        this.handleGameStart(event)
        break
      case 'ball_missed':
        this.handleBallMissed(event)
        break
      case 'paddle_hit':
        this.handlePaddleHit(event)
        break
      case 'block_hit':
        this.handleBlockHit(event)
        break
      case 'game_end':
        this.handleGameEnd(event)
        break
    }

    this.updateMetrics()
  }

  private handleGameStart(_event: BlockBreakerGameEvent): void {
    this.currentMetrics.currentRallyLength = 0
    this.behaviorData.gamesPlayed++
  }

  private handleBallMissed(event: BlockBreakerGameEvent): void {
    if (!event.data?.ballPosition) return

    const missLocation = event.data.ballPosition
    const zone = classifyMissZone(missLocation.x, this.gameWidth)
    
    // Track miss data
    this.behaviorData.missedBallLocations.push({
      x: missLocation.x,
      y: missLocation.y,
      timestamp: event.timestamp
    })
    
    this.behaviorData.totalMisses++
    this.behaviorData.consecutiveMisses++
    
    // Update failure zones
    const currentCount = this.behaviorData.failureZones.get(zone) || 0
    this.behaviorData.failureZones.set(zone, currentCount + 1)
    
    // Track rally length before miss
    if (this.currentMetrics.currentRallyLength > 0) {
      this.behaviorData.rallyLengths.push(this.currentMetrics.currentRallyLength)
    }
    
    // Update current metrics
    this.currentMetrics.lastMissLocation = missLocation
    this.currentMetrics.currentRallyLength = 0
    
    // Check for repeated failures in same zone
    this.analyzeFailurePatterns(zone)
  }

  private handlePaddleHit(event: BlockBreakerGameEvent): void {
    const hitTime = event.timestamp
    
    // Calculate reaction time if we have a previous reference
    if (this.lastPaddleHitTime > 0) {
      const reactionTime = hitTime - this.lastPaddleHitTime
      this.behaviorData.paddleReactionTimes.push(reactionTime)
      this.currentMetrics.lastReactionTime = reactionTime
    }
    
    this.lastPaddleHitTime = hitTime
    this.currentMetrics.currentRallyLength++
    this.behaviorData.consecutiveMisses = 0 // Reset miss streak
  }

  private handleBlockHit(_event: BlockBreakerGameEvent): void {
    // Block hits extend the rally
    this.currentMetrics.currentRallyLength++
  }

  private handleGameEnd(event: BlockBreakerGameEvent): void {
    const score = event.data?.score || 0
    
    if (score > this.behaviorData.bestScore) {
      this.behaviorData.bestScore = score
      this.currentMetrics.isImproving = true
      this.currentMetrics.shouldCommentOnImprovement = true
    }
    
    // Finalize rally if game ended mid-rally
    if (this.currentMetrics.currentRallyLength > 0) {
      this.behaviorData.rallyLengths.push(this.currentMetrics.currentRallyLength)
    }
    
    this.analyzeImprovementTrend()
  }

  private analyzeFailurePatterns(zone: FailureZone): void {
    const zoneCount = this.behaviorData.failureZones.get(zone) || 0
    
    // Check if this zone is becoming a repeated problem
    if (zoneCount >= 3) {
      this.currentMetrics.repeatedFailureZone = zone
      this.currentMetrics.failureZoneCount = zoneCount
      this.currentMetrics.shouldCommentOnMiss = true
      
      // Escalate sarcasm for persistent failures
      if (zoneCount >= 5) {
        this.currentMetrics.shouldEscalateSarcasm = true
      }
    }
  }

  private analyzeImprovementTrend(): void {
    const recentGames = Math.min(5, this.behaviorData.gamesPlayed)
    if (recentGames < 3) {
      this.behaviorData.improvementTrend = 'stable'
      return
    }

    // Simple trend analysis based on recent performance
    const recentRallies = this.behaviorData.rallyLengths.slice(-recentGames)
    const earlierRallies = this.behaviorData.rallyLengths.slice(-recentGames * 2, -recentGames)
    
    if (recentRallies.length === 0 || earlierRallies.length === 0) {
      this.behaviorData.improvementTrend = 'stable'
      return
    }
    
    const recentAvg = recentRallies.reduce((a, b) => a + b, 0) / recentRallies.length
    const earlierAvg = earlierRallies.reduce((a, b) => a + b, 0) / earlierRallies.length
    
    if (recentAvg > earlierAvg * 1.2) {
      this.behaviorData.improvementTrend = 'improving'
    } else if (recentAvg < earlierAvg * 0.8) {
      this.behaviorData.improvementTrend = 'declining'
    } else {
      this.behaviorData.improvementTrend = 'stable'
    }
  }

  private updateMetrics(): void {
    // Update averages
    if (this.behaviorData.paddleReactionTimes.length > 0) {
      this.behaviorData.averageReactionTime = 
        this.behaviorData.paddleReactionTimes.reduce((a, b) => a + b, 0) / 
        this.behaviorData.paddleReactionTimes.length
    }
    
    if (this.behaviorData.rallyLengths.length > 0) {
      this.behaviorData.averageRallyLength = 
        this.behaviorData.rallyLengths.reduce((a, b) => a + b, 0) / 
        this.behaviorData.rallyLengths.length
    }
    
    // Find most failed zone
    let maxCount = 0
    let mostFailedZone = null
    
    for (const [zone, count] of this.behaviorData.failureZones.entries()) {
      if (count > maxCount) {
        maxCount = count
        mostFailedZone = zone
      }
    }
    
    this.behaviorData.mostFailedZone = mostFailedZone
  }

  getBehaviorData(): BlockBreakerBehaviorData {
    return { ...this.behaviorData }
  }

  getCurrentMetrics(): BlockBreakerPerformanceMetrics {
    return { ...this.currentMetrics }
  }

  // Reset commentary flags after they've been used
  clearCommentaryFlags(): void {
    this.currentMetrics.shouldCommentOnMiss = false
    this.currentMetrics.shouldCommentOnImprovement = false
    this.currentMetrics.shouldEscalateSarcasm = false
  }
}