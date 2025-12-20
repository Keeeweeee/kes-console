// Block Breaker AI - Main analyzer combining behavior tracking and corruption

import { BlockBreakerBehaviorTracker } from './BlockBreakerBehaviorTracker'
import { BlockBreakerCommentaryGenerator } from './BlockBreakerCommentaryGenerator'
import { BlockBreakerCorruptionSystem, CorruptionState } from './BlockBreakerCorruptionSystem'
import { 
  BlockBreakerGameEvent, 
  BlockBreakerBehaviorData, 
  BlockBreakerPerformanceMetrics 
} from './BlockBreakerBehaviorTypes'

export interface BlockBreakerAIState {
  commentary: string
  behaviorData: BlockBreakerBehaviorData
  performanceMetrics: BlockBreakerPerformanceMetrics
  corruptionState: CorruptionState
}

export class BlockBreakerAIAnalyzer {
  private behaviorTracker: BlockBreakerBehaviorTracker
  private commentaryGenerator: BlockBreakerCommentaryGenerator
  private corruptionSystem: BlockBreakerCorruptionSystem
  private currentCommentary: string = '► BLOCK BREAKER AI READY'
  private lastCommentaryTime: number = 0
  private readonly COMMENTARY_COOLDOWN = 3000 // 3 seconds

  constructor() {
    this.behaviorTracker = new BlockBreakerBehaviorTracker()
    this.commentaryGenerator = new BlockBreakerCommentaryGenerator()
    this.corruptionSystem = new BlockBreakerCorruptionSystem()
  }

  // Initialize game dimensions
  initializeGame(gameWidth: number): BlockBreakerAIState {
    this.behaviorTracker.setGameDimensions(gameWidth)
    this.corruptionSystem.reset()
    
    const behaviorData = this.behaviorTracker.getBehaviorData()
    this.currentCommentary = this.commentaryGenerator.generateGameStartCommentary(behaviorData)
    this.lastCommentaryTime = Date.now()
    
    return this.getCurrentState()
  }

  // Process game events and update AI state
  processGameEvent(event: BlockBreakerGameEvent): BlockBreakerAIState {
    this.behaviorTracker.trackEvent(event)
    
    const behaviorData = this.behaviorTracker.getBehaviorData()
    const metrics = this.behaviorTracker.getCurrentMetrics()
    const now = Date.now()
    
    // Update corruption system
    this.updateCorruptionSystem(event)
    
    // Generate appropriate commentary based on event (with cooldown)
    if (now - this.lastCommentaryTime >= this.COMMENTARY_COOLDOWN) {
      switch (event.type) {
        case 'ball_missed':
          this.corruptionSystem.onBallMissed()
          this.updateCommentaryWithCooldown(
            this.commentaryGenerator.generateMissCommentary(behaviorData, metrics),
            now
          )
          break
          
        case 'paddle_hit':
          // Track paddle hit for corruption
          if (event.data?.paddlePosition !== undefined) {
            this.corruptionSystem.trackPaddleMovement(event.data.paddlePosition)
            // Calculate bounce angle (simplified)
            const bounceAngle = (event.data.paddlePosition - 400) / 400; // Normalized -1 to 1
            this.corruptionSystem.onPaddleHit(bounceAngle)
          }
          
          // Check for rally milestones
          if (metrics.currentRallyLength > 0 && metrics.currentRallyLength % 5 === 0) {
            this.updateCommentaryWithCooldown(
              this.commentaryGenerator.generateRallyCommentary(metrics.currentRallyLength, behaviorData),
              now
            )
          }
          break
          
        case 'block_hit':
          this.corruptionSystem.onBlockDestroyed()
          
          // Check if corruption level changed
          if (this.corruptionSystem.checkLevelChange()) {
            const level = this.corruptionSystem.getCorruptionLevel()
            this.updateCommentaryWithCooldown(
              this.generateCorruptionCommentary(level),
              now
            )
          }
          
          // Trigger speed spike for level 3
          if (this.corruptionSystem.getCorruptionLevel() >= 3) {
            this.corruptionSystem.triggerSpeedSpike()
          }
          break
          
        case 'game_end':
          // Reset corruption on game end
          this.corruptionSystem.reset()
          
          const result = (event.data?.blocksRemaining === 0) ? 'won' : 'lost'
          const score = event.data?.score || 0
          this.updateCommentaryWithCooldown(
            this.commentaryGenerator.generateGameEndCommentary(result, score, behaviorData),
            now
          )
          break
      }
    }
    
    // Check for improvement commentary
    if (metrics.shouldCommentOnImprovement && now - this.lastCommentaryTime >= this.COMMENTARY_COOLDOWN) {
      this.updateCommentaryWithCooldown(
        this.commentaryGenerator.generateImprovementCommentary(behaviorData, metrics),
        now
      )
    }
    
    // Update corruption system
    this.corruptionSystem.update()
    
    // Clear commentary flags after use
    this.behaviorTracker.clearCommentaryFlags()
    
    return this.getCurrentState()
  }

  // Get current AI state
  getCurrentState(): BlockBreakerAIState {
    return {
      commentary: this.currentCommentary,
      behaviorData: this.behaviorTracker.getBehaviorData(),
      performanceMetrics: this.behaviorTracker.getCurrentMetrics(),
      corruptionState: this.corruptionSystem.getCorruptionState()
    }
  }

  // Update corruption system based on events
  private updateCorruptionSystem(_event: BlockBreakerGameEvent): void {
    // Paddle movement tracking happens in paddle_hit event
    // Other tracking happens in specific event handlers
  }

  // Update commentary with cooldown
  private updateCommentaryWithCooldown(commentary: string, timestamp: number): void {
    this.currentCommentary = commentary
    this.lastCommentaryTime = timestamp
  }

  // Generate corruption-specific commentary
  private generateCorruptionCommentary(level: number): string {
    const commentaries = {
      1: [
        "► YOU'RE GETTING COMFORTABLE.",
        "► SAFE RALLY DETECTED. FIXING THAT.",
        "► PATTERN RECOGNIZED. ADAPTING."
      ],
      2: [
        "► THAT BLOCK CAME BACK. WEIRD.",
        "► PADDLE FEELS DIFFERENT? GOOD.",
        "► ANGLE BIAS APPLIED. YOU'RE WELCOME."
      ],
      3: [
        "► PERFECT BOUNCE. LET'S FIX THAT.",
        "► FAKE BLOCKS DEPLOYED. TRUST NOTHING.",
        "► SPEED SPIKE INCOMING. ENJOY."
      ]
    }
    
    const options = commentaries[level as keyof typeof commentaries] || commentaries[1]
    return options[Math.floor(Math.random() * options.length)]
  }

  // Manual commentary updates for specific situations
  updateCommentary(newCommentary: string): void {
    this.currentCommentary = newCommentary
  }

  // Get performance summary for debugging
  getPerformanceSummary(): string {
    const data = this.behaviorTracker.getBehaviorData()
    const metrics = this.behaviorTracker.getCurrentMetrics()
    const corruption = this.corruptionSystem.getCorruptionState()
    
    return `
Performance Summary:
- Games Played: ${data.gamesPlayed}
- Total Misses: ${data.totalMisses}
- Best Score: ${data.bestScore}
- Average Rally: ${data.averageRallyLength.toFixed(1)}
- Most Failed Zone: ${data.mostFailedZone || 'None'}
- Current Rally: ${metrics.currentRallyLength}
- Improvement Trend: ${data.improvementTrend}
- Corruption Level: ${corruption.level}
- Ball Speed: ${corruption.ballSpeedMultiplier.toFixed(1)}x
- Paddle Width: ${corruption.paddleWidthMultiplier.toFixed(1)}x
    `.trim()
  }

  // Methods for game integration
  getBallSpeedMultiplier(): number {
    return this.corruptionSystem.getCorruptionState().ballSpeedMultiplier
  }

  getPaddleWidthMultiplier(): number {
    return this.corruptionSystem.getCorruptionState().paddleWidthMultiplier
  }

  getPaddleDrift(): number {
    return this.corruptionSystem.getCorruptionState().paddleDrift
  }

  getBounceAngleBias(): number {
    return this.corruptionSystem.getCorruptionState().bounceAngleBias
  }

  getFakeBlocks(): Array<{ x: number; y: number; width: number; height: number; flickering: boolean }> {
    return this.corruptionSystem.getCorruptionState().fakeBlocks
  }

  getRegeneratingBlocks(): Array<{ x: number; y: number; width: number; height: number; opacity: number }> {
    return this.corruptionSystem.getCorruptionState().regeneratingBlocks
  }

  // Handle fake block hit
  onFakeBlockHit(x: number, y: number): boolean {
    const wasRemoved = this.corruptionSystem.removeFakeBlock(x, y)
    if (wasRemoved) {
      // Generate commentary for fake block hit
      const now = Date.now()
      if (now - this.lastCommentaryTime >= this.COMMENTARY_COOLDOWN) {
        const fakeBlockCommentaries = [
          "► THAT ONE'S SLIMEY, HUH?",
          "► FAKE BLOCK. GOTCHA.",
          "► NOT EVERYTHING IS REAL.",
          "► ILLUSION SHATTERED."
        ]
        this.updateCommentaryWithCooldown(
          fakeBlockCommentaries[Math.floor(Math.random() * fakeBlockCommentaries.length)],
          now
        )
      }
      
      // Make fake block reappear after delay (for level 3)
      if (this.corruptionSystem.getCorruptionLevel() >= 3) {
        setTimeout(() => {
          this.corruptionSystem.addRegeneratingBlock(x, y, 70, 20)
        }, 2000) // Reappear after 2 seconds
      }
    }
    return wasRemoved
  }

  // Add regenerating block (for level 2+)
  addRegeneratingBlock(x: number, y: number, width: number, height: number): void {
    this.corruptionSystem.addRegeneratingBlock(x, y, width, height)
  }

  // Get count of regenerating blocks that should be added to game block count
  getRegeneratingBlocksToAdd(): Array<{ x: number; y: number; width: number; height: number }> {
    return this.corruptionSystem.getFullyRegeneratedBlocks()
  }

  // Get fully regenerated blocks that should become real blocks
  getFullyRegeneratedBlocks(): Array<{ x: number; y: number; width: number; height: number }> {
    return this.corruptionSystem.getFullyRegeneratedBlocks()
  }

  // Handle regenerating block hit
  onRegeneratingBlockHit(x: number, y: number): boolean {
    return this.corruptionSystem.removeRegeneratingBlock(x, y)
  }

  // Get total corruption block count (for win condition)
  getTotalCorruptionBlockCount(): number {
    return this.corruptionSystem.getTotalBlockCount()
  }

  // Reset corruption (for game reset)
  resetCorruption(): void {
    this.corruptionSystem.reset()
  }

  // Get stubborn blocks
  getStubbornBlocks(): Array<{ x: number; y: number; width: number; height: number }> {
    return this.corruptionSystem.getStubbornBlocks()
  }

  // Handle stubborn block hit
  onStubbornBlockHit(): void {
    // Generate commentary for stubborn block hit
    const now = Date.now()
    if (now - this.lastCommentaryTime >= this.COMMENTARY_COOLDOWN) {
      this.updateCommentaryWithCooldown(
        "► IS THAT ONE FAKE OR JUST STUBBORN?",
        now
      )
    }
  }
}