// Block Breaker Game - Core game mechanics and physics

export interface Position {
  x: number
  y: number
}

export interface Velocity {
  x: number
  y: number
}

export interface Block {
  x: number
  y: number
  width: number
  height: number
  destroyed: boolean
  color: string
}

export interface Ball {
  x: number
  y: number
  radius: number
  velocity: Velocity
}

export interface Paddle {
  x: number
  y: number
  width: number
  height: number
}

export type GameState = 'waiting' | 'playing' | 'paused' | 'game_over' | 'won'

export interface CorruptionEffects {
  ballSpeedMultiplier: number
  paddleWidthMultiplier: number
  paddleDrift: number
  bounceAngleBias: number
}

export interface BlockBreakerGameData {
  ball: Ball
  paddle: Paddle
  blocks: Block[]
  score: number
  lives: number
  gameState: GameState
  gameWidth: number
  gameHeight: number
}

export class BlockBreakerGame {
  private gameData: BlockBreakerGameData
  private readonly PADDLE_SPEED = 8
  private readonly BALL_SPEED = 4
  private readonly BLOCK_ROWS = 6
  private readonly BLOCK_COLS = 10
  private readonly BLOCK_WIDTH = 70
  private readonly BLOCK_HEIGHT = 20
  private readonly BLOCK_PADDING = 5
  private readonly BASE_PADDLE_WIDTH = 100
  
  // Corruption state
  private corruptionEffects: CorruptionEffects = {
    ballSpeedMultiplier: 1.0,
    paddleWidthMultiplier: 1.0,
    paddleDrift: 0,
    bounceAngleBias: 0
  }

  constructor(width: number = 800, height: number = 600) {
    this.gameData = {
      ball: {
        x: width / 2,
        y: height - 100,
        radius: 8,
        velocity: { x: this.BALL_SPEED, y: -this.BALL_SPEED }
      },
      paddle: {
        x: width / 2 - 50,
        y: height - 30,
        width: this.BASE_PADDLE_WIDTH,
        height: 15
      },
      blocks: [],
      score: 0,
      lives: 3,
      gameState: 'waiting',
      gameWidth: width,
      gameHeight: height
    }

    this.initializeBlocks()
  }

  private initializeBlocks(): void {
    this.gameData.blocks = []
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD']
    
    for (let row = 0; row < this.BLOCK_ROWS; row++) {
      for (let col = 0; col < this.BLOCK_COLS; col++) {
        const x = col * (this.BLOCK_WIDTH + this.BLOCK_PADDING) + this.BLOCK_PADDING + 50
        const y = row * (this.BLOCK_HEIGHT + this.BLOCK_PADDING) + this.BLOCK_PADDING + 50
        
        this.gameData.blocks.push({
          x,
          y,
          width: this.BLOCK_WIDTH,
          height: this.BLOCK_HEIGHT,
          destroyed: false,
          color: colors[row % colors.length]
        })
      }
    }
  }

  startGame(): void {
    if (this.gameData.gameState === 'waiting' || this.gameData.gameState === 'game_over') {
      this.gameData.gameState = 'playing'
      this.resetBall()
    }
  }

  pauseGame(): void {
    if (this.gameData.gameState === 'playing') {
      this.gameData.gameState = 'paused'
    }
  }

  resumeGame(): void {
    if (this.gameData.gameState === 'paused') {
      this.gameData.gameState = 'playing'
    }
  }

  resetGame(): void {
    this.gameData.score = 0
    this.gameData.lives = 3
    this.gameData.gameState = 'waiting'
    this.initializeBlocks()
    this.resetBall()
    // Reset corruption effects
    this.corruptionEffects = {
      ballSpeedMultiplier: 1.0,
      paddleWidthMultiplier: 1.0,
      paddleDrift: 0,
      bounceAngleBias: 0
    }
  }

  private resetBall(): void {
    this.gameData.ball.x = this.gameData.gameWidth / 2
    this.gameData.ball.y = this.gameData.gameHeight - 100
    
    // Random angle between -45 and 45 degrees
    const angle = (Math.random() - 0.5) * Math.PI / 2
    this.gameData.ball.velocity.x = Math.sin(angle) * this.BALL_SPEED
    this.gameData.ball.velocity.y = -Math.cos(angle) * this.BALL_SPEED
  }

  movePaddle(direction: 'left' | 'right'): void {
    if (this.gameData.gameState !== 'playing') return

    if (direction === 'left') {
      this.gameData.paddle.x = Math.max(0, this.gameData.paddle.x - this.PADDLE_SPEED)
    } else {
      this.gameData.paddle.x = Math.min(
        this.gameData.gameWidth - this.gameData.paddle.width,
        this.gameData.paddle.x + this.PADDLE_SPEED
      )
    }
  }

  setPaddlePosition(x: number): void {
    if (this.gameData.gameState !== 'playing') return
    
    this.gameData.paddle.x = Math.max(0, Math.min(
      this.gameData.gameWidth - this.gameData.paddle.width,
      x - this.gameData.paddle.width / 2
    ))
  }

  // Apply AI corruption effects
  applyCorruptionEffects(effects: CorruptionEffects): void {
    this.corruptionEffects = { ...effects }
    
    // Apply paddle width corruption
    const newWidth = this.BASE_PADDLE_WIDTH * effects.paddleWidthMultiplier
    const widthDiff = this.gameData.paddle.width - newWidth
    this.gameData.paddle.width = newWidth
    
    // Adjust paddle position to keep it centered when shrinking
    if (widthDiff > 0) {
      this.gameData.paddle.x += widthDiff / 2
      this.gameData.paddle.x = Math.max(0, Math.min(
        this.gameData.gameWidth - this.gameData.paddle.width,
        this.gameData.paddle.x
      ))
    }
  }

  update(): { 
    ballMissed?: boolean
    paddleHit?: boolean
    blockHit?: boolean
    gameWon?: boolean
    ballPosition?: Position
    paddlePosition?: number
    blocksRemaining?: number
  } {
    if (this.gameData.gameState !== 'playing') return {}

    const result: any = {}
    
    // Apply corruption effects to ball speed
    const effectiveVelocityX = this.gameData.ball.velocity.x * this.corruptionEffects.ballSpeedMultiplier
    const effectiveVelocityY = this.gameData.ball.velocity.y * this.corruptionEffects.ballSpeedMultiplier
    
    // Update ball position
    this.gameData.ball.x += effectiveVelocityX
    this.gameData.ball.y += effectiveVelocityY
    
    // Apply paddle drift corruption
    if (this.corruptionEffects.paddleDrift !== 0) {
      const drift = (Math.random() - 0.5) * this.corruptionEffects.paddleDrift * 2
      this.gameData.paddle.x += drift
      this.gameData.paddle.x = Math.max(0, Math.min(
        this.gameData.gameWidth - this.gameData.paddle.width,
        this.gameData.paddle.x
      ))
    }

    // Ball collision with walls
    if (this.gameData.ball.x <= this.gameData.ball.radius || 
        this.gameData.ball.x >= this.gameData.gameWidth - this.gameData.ball.radius) {
      this.gameData.ball.velocity.x = -this.gameData.ball.velocity.x
    }

    if (this.gameData.ball.y <= this.gameData.ball.radius) {
      this.gameData.ball.velocity.y = -this.gameData.ball.velocity.y
    }

    // Ball collision with paddle
    if (this.checkPaddleCollision()) {
      this.handlePaddleCollision()
      result.paddleHit = true
      result.paddlePosition = this.gameData.paddle.x + this.gameData.paddle.width / 2
    }

    // Ball collision with blocks
    const hitBlock = this.checkBlockCollisions()
    if (hitBlock) {
      this.handleBlockCollision(hitBlock)
      result.blockHit = true
      this.gameData.score += 10
    }

    // Check if ball is missed
    if (this.gameData.ball.y > this.gameData.gameHeight) {
      result.ballMissed = true
      result.ballPosition = { x: this.gameData.ball.x, y: this.gameData.ball.y }
      this.handleBallMissed()
    }

    // Check win condition (will be updated by game loop with corruption blocks)
    const remainingBlocks = this.gameData.blocks.filter(block => !block.destroyed).length
    result.blocksRemaining = remainingBlocks

    return result
  }

  private checkPaddleCollision(): boolean {
    const ball = this.gameData.ball
    const paddle = this.gameData.paddle

    return ball.x + ball.radius >= paddle.x &&
           ball.x - ball.radius <= paddle.x + paddle.width &&
           ball.y + ball.radius >= paddle.y &&
           ball.y - ball.radius <= paddle.y + paddle.height &&
           ball.velocity.y > 0 // Ball moving downward
  }

  private handlePaddleCollision(): void {
    const ball = this.gameData.ball
    const paddle = this.gameData.paddle
    
    // Calculate hit position on paddle (0 to 1)
    const hitPos = (ball.x - paddle.x) / paddle.width
    
    // Adjust ball angle based on hit position
    let angle = (hitPos - 0.5) * Math.PI / 3 // Max 60 degrees
    
    // Apply corruption bounce angle bias
    angle += this.corruptionEffects.bounceAngleBias * (Math.random() - 0.5) * Math.PI / 4
    
    const speed = Math.sqrt(ball.velocity.x ** 2 + ball.velocity.y ** 2)
    
    ball.velocity.x = Math.sin(angle) * speed
    ball.velocity.y = -Math.abs(Math.cos(angle) * speed) // Always upward
    
    // Ensure ball is above paddle
    ball.y = paddle.y - ball.radius
  }

  private checkBlockCollisions(): Block | null {
    const ball = this.gameData.ball
    
    for (const block of this.gameData.blocks) {
      if (block.destroyed) continue
      
      if (ball.x + ball.radius >= block.x &&
          ball.x - ball.radius <= block.x + block.width &&
          ball.y + ball.radius >= block.y &&
          ball.y - ball.radius <= block.y + block.height) {
        return block
      }
    }
    
    return null
  }

  private handleBlockCollision(block: Block): void {
    block.destroyed = true
    
    // Simple collision response - reverse Y velocity
    this.gameData.ball.velocity.y = -this.gameData.ball.velocity.y
  }

  private handleBallMissed(): void {
    this.gameData.lives--
    
    if (this.gameData.lives <= 0) {
      this.gameData.gameState = 'game_over'
    } else {
      this.resetBall()
    }
  }

  getGameData(): BlockBreakerGameData {
    return { ...this.gameData }
  }

  getScore(): number {
    return this.gameData.score
  }

  getLives(): number {
    return this.gameData.lives
  }

  getGameState(): GameState {
    return this.gameData.gameState
  }

  getRemainingBlocks(): number {
    return this.gameData.blocks.filter(block => !block.destroyed).length
  }

  // Check collision with fake blocks (for AI integration)
  checkFakeBlockCollision(fakeBlocks: Array<{ x: number; y: number; width: number; height: number }>): { x: number; y: number } | null {
    const ball = this.gameData.ball
    
    for (const block of fakeBlocks) {
      if (ball.x + ball.radius >= block.x &&
          ball.x - ball.radius <= block.x + block.width &&
          ball.y + ball.radius >= block.y &&
          ball.y - ball.radius <= block.y + block.height) {
        return { x: block.x, y: block.y }
      }
    }
    
    return null
  }

  // Check collision with regenerating blocks (for AI integration)
  checkRegeneratingBlockCollision(regenBlocks: Array<{ x: number; y: number; width: number; height: number; opacity: number }>): { x: number; y: number } | null {
    const ball = this.gameData.ball
    
    for (const block of regenBlocks) {
      if (block.opacity >= 0.3 && // Can be hit when 30% solid (more responsive)
          ball.x + ball.radius >= block.x &&
          ball.x - ball.radius <= block.x + block.width &&
          ball.y + ball.radius >= block.y &&
          ball.y - ball.radius <= block.y + block.height) {
        // Bounce ball off regenerating block
        this.gameData.ball.velocity.y = -this.gameData.ball.velocity.y
        return { x: block.x, y: block.y }
      }
    }
    
    return null
  }

  // Check collision with stubborn blocks (for AI integration)
  checkStubbornBlockCollision(stubbornBlocks: Array<{ x: number; y: number; width: number; height: number }>): { x: number; y: number } | null {
    const ball = this.gameData.ball
    
    for (const block of stubbornBlocks) {
      if (ball.x + ball.radius >= block.x &&
          ball.x - ball.radius <= block.x + block.width &&
          ball.y + ball.radius >= block.y &&
          ball.y - ball.radius <= block.y + block.height) {
        // Bounce ball off stubborn block (but don't destroy it)
        this.gameData.ball.velocity.y = -this.gameData.ball.velocity.y
        return { x: block.x, y: block.y }
      }
    }
    
    return null
  }

  // Add regenerated blocks as real blocks
  addRegeneratedBlocks(blocks: Array<{ x: number; y: number; width: number; height: number }>): void {
    blocks.forEach(block => {
      this.gameData.blocks.push({
        x: block.x,
        y: block.y,
        width: block.width,
        height: block.height,
        destroyed: false,
        color: '#FF6B6B' // Red color for regenerated blocks
      })
    })
  }

  // Check win condition including corruption blocks
  checkWinCondition(corruptionBlockCount: number): boolean {
    const remainingBlocks = this.gameData.blocks.filter(block => !block.destroyed).length
    const hasWon = remainingBlocks === 0 && corruptionBlockCount === 0
    
    if (hasWon && this.gameData.gameState === 'playing') {
      this.gameData.gameState = 'won'
    }
    
    return hasWon
  }

  // Set game state to won (for new win condition)
  setGameWon(): void {
    if (this.gameData.gameState === 'playing') {
      this.gameData.gameState = 'won'
    }
  }
}