// Block Breaker Renderer - Canvas-based rendering for retro aesthetics

import { useEffect, useRef } from 'react'
import { BlockBreakerGameData } from './BlockBreakerGame'
import { BlockBreakerAIState } from '../../ai/blockbreaker/BlockBreakerAIAnalyzer'

interface BlockBreakerRendererProps {
  gameData: BlockBreakerGameData
  aiState: BlockBreakerAIState | null
  width: number
  height: number
}

const BlockBreakerRenderer: React.FC<BlockBreakerRendererProps> = ({ 
  gameData, 
  aiState,
  width, 
  height 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, width, height)

    // Draw game elements
    drawBlocks(ctx, gameData.blocks)
    
    // Draw corruption effects
    if (aiState) {
      drawFakeBlocks(ctx, aiState.corruptionState.fakeBlocks)
      drawRegeneratingBlocks(ctx, aiState.corruptionState.regeneratingBlocks)
      drawStubbornBlocks(ctx, aiState.corruptionState.stubbornBlocks)
    }
    
    drawPaddle(ctx, gameData.paddle, aiState)
    drawBall(ctx, gameData.ball, aiState)
    drawUI(ctx, gameData, width, aiState)
    drawGameState(ctx, gameData, width, height)

  }, [gameData, aiState, width, height])

  const drawBlocks = (ctx: CanvasRenderingContext2D, blocks: any[]) => {
    blocks.forEach(block => {
      if (block.destroyed) return

      // Block shadow
      ctx.fillStyle = '#000000'
      ctx.fillRect(block.x + 2, block.y + 2, block.width, block.height)

      // Block body
      ctx.fillStyle = block.color
      ctx.fillRect(block.x, block.y, block.width, block.height)

      // Block highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
      ctx.fillRect(block.x, block.y, block.width, 3)
      ctx.fillRect(block.x, block.y, 3, block.height)

      // Block border
      ctx.strokeStyle = '#333'
      ctx.lineWidth = 1
      ctx.strokeRect(block.x, block.y, block.width, block.height)
    })
  }

  const drawPaddle = (ctx: CanvasRenderingContext2D, paddle: any, aiState: BlockBreakerAIState | null) => {
    // Paddle shadow
    ctx.fillStyle = '#000000'
    ctx.fillRect(paddle.x + 2, paddle.y + 2, paddle.width, paddle.height)

    // Paddle body - change color if corrupted
    const isCorrupted = aiState && aiState.corruptionState.level >= 2
    ctx.fillStyle = isCorrupted ? '#FF6B6B' : '#4ECDC4'
    ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height)

    // Paddle highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
    ctx.fillRect(paddle.x, paddle.y, paddle.width, 3)

    // Paddle border - thicker if corrupted
    ctx.strokeStyle = isCorrupted ? '#C0392B' : '#2C3E50'
    ctx.lineWidth = isCorrupted ? 3 : 2
    ctx.strokeRect(paddle.x, paddle.y, paddle.width, paddle.height)
    
    // Add corruption visual effects
    if (isCorrupted && aiState) {
      // Shrink animation indicator
      if (aiState.corruptionState.paddleWidthMultiplier < 1.0) {
        ctx.strokeStyle = '#F39C12'
        ctx.lineWidth = 1
        ctx.setLineDash([5, 5])
        ctx.strokeRect(paddle.x - 5, paddle.y - 5, paddle.width + 10, paddle.height + 10)
        ctx.setLineDash([])
      }
    }
  }

  const drawBall = (ctx: CanvasRenderingContext2D, ball: any, aiState: BlockBreakerAIState | null) => {
    // Ball shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
    ctx.beginPath()
    ctx.arc(ball.x + 2, ball.y + 2, ball.radius, 0, Math.PI * 2)
    ctx.fill()

    // Ball body - change color based on speed corruption
    const speedMultiplier = aiState?.corruptionState.ballSpeedMultiplier || 1.0
    const isSpeedCorrupted = speedMultiplier > 1.2
    ctx.fillStyle = isSpeedCorrupted ? '#F39C12' : '#FF6B6B'
    ctx.beginPath()
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2)
    ctx.fill()

    // Ball highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
    ctx.beginPath()
    ctx.arc(ball.x - 2, ball.y - 2, ball.radius / 3, 0, Math.PI * 2)
    ctx.fill()

    // Ball border - thicker if speed corrupted
    ctx.strokeStyle = isSpeedCorrupted ? '#E67E22' : '#C0392B'
    ctx.lineWidth = isSpeedCorrupted ? 2 : 1
    ctx.beginPath()
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2)
    ctx.stroke()
    
    // Speed spike visual effect
    if (aiState?.corruptionState.speedSpikeActive) {
      ctx.strokeStyle = '#E74C3C'
      ctx.lineWidth = 3
      ctx.setLineDash([3, 3])
      ctx.beginPath()
      ctx.arc(ball.x, ball.y, ball.radius + 5, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])
    }
  }

  const drawUI = (ctx: CanvasRenderingContext2D, gameData: BlockBreakerGameData, width: number, aiState: BlockBreakerAIState | null) => {
    ctx.font = '16px Courier New, monospace'
    ctx.fillStyle = '#4ECDC4'
    
    // Score
    ctx.fillText(`SCORE: ${gameData.score}`, 20, 30)
    
    // Lives
    ctx.fillText(`LIVES: ${gameData.lives}`, width - 120, 30)
    
    // Remaining blocks
    const remaining = gameData.blocks.filter(block => !block.destroyed).length
    ctx.fillText(`BLOCKS: ${remaining}`, width / 2 - 50, 30)
    
    // Corruption level indicator
    if (aiState && aiState.corruptionState.level > 0) {
      ctx.font = '12px Courier New, monospace'
      ctx.fillStyle = '#E74C3C'
      ctx.fillText(`CORRUPTION: ${aiState.corruptionState.level}`, 20, 580) // Fixed position near bottom
    }
  }

  const drawGameState = (
    ctx: CanvasRenderingContext2D, 
    gameData: BlockBreakerGameData, 
    width: number, 
    height: number
  ) => {
    if (gameData.gameState === 'waiting') {
      drawCenteredText(ctx, 'PRESS SPACE TO START', width, height, '#4ECDC4', '20px')
      drawCenteredText(ctx, 'USE ARROW KEYS OR MOUSE TO MOVE PADDLE', width, height + 30, '#95A5A6', '14px')
    } else if (gameData.gameState === 'paused') {
      drawCenteredText(ctx, 'PAUSED', width, height, '#F39C12', '24px')
      drawCenteredText(ctx, 'PRESS SPACE TO RESUME', width, height + 30, '#95A5A6', '16px')
    } else if (gameData.gameState === 'game_over') {
      drawCenteredText(ctx, 'GAME OVER', width, height, '#E74C3C', '28px')
      drawCenteredText(ctx, `FINAL SCORE: ${gameData.score}`, width, height + 40, '#95A5A6', '18px')
      drawCenteredText(ctx, 'PRESS R TO RESTART', width, height + 70, '#4ECDC4', '16px')
    } else if (gameData.gameState === 'won') {
      drawCenteredText(ctx, 'VICTORY!', width, height, '#27AE60', '32px')
      drawCenteredText(ctx, `FINAL SCORE: ${gameData.score}`, width, height + 50, '#95A5A6', '20px')
      drawCenteredText(ctx, 'PRESS R TO PLAY AGAIN', width, height + 80, '#4ECDC4', '16px')
    }
  }

  const drawFakeBlocks = (ctx: CanvasRenderingContext2D, fakeBlocks: Array<{ x: number; y: number; width: number; height: number; flickering: boolean }>) => {
    fakeBlocks.forEach(block => {
      // Flickering effect
      const opacity = block.flickering ? 0.3 + Math.sin(Date.now() * 0.01) * 0.3 : 0.6
      
      // Fake block shadow (dimmer)
      ctx.fillStyle = `rgba(0, 0, 0, ${opacity * 0.5})`
      ctx.fillRect(block.x + 2, block.y + 2, block.width, block.height)

      // Fake block body (different color)
      ctx.fillStyle = `rgba(138, 43, 226, ${opacity})` // Purple with opacity
      ctx.fillRect(block.x, block.y, block.width, block.height)

      // Fake block highlight
      ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.2})`
      ctx.fillRect(block.x, block.y, block.width, 3)
      ctx.fillRect(block.x, block.y, 3, block.height)

      // Fake block border (dashed)
      ctx.strokeStyle = `rgba(75, 0, 130, ${opacity})`
      ctx.lineWidth = 1
      ctx.setLineDash([3, 3])
      ctx.strokeRect(block.x, block.y, block.width, block.height)
      ctx.setLineDash([])
    })
  }

  const drawRegeneratingBlocks = (ctx: CanvasRenderingContext2D, regenBlocks: Array<{ x: number; y: number; width: number; height: number; opacity: number }>) => {
    regenBlocks.forEach(block => {
      // Make blocks visible when they can be hit (30%+ opacity)
      const isHittable = block.opacity >= 0.3
      const displayOpacity = Math.max(block.opacity, isHittable ? 0.3 : 0)
      
      // Regenerating block shadow
      ctx.fillStyle = `rgba(0, 0, 0, ${displayOpacity * 0.5})`
      ctx.fillRect(block.x + 2, block.y + 2, block.width, block.height)

      // Regenerating block body (fading in)
      ctx.fillStyle = `rgba(255, 107, 107, ${displayOpacity})` // Red with growing opacity
      ctx.fillRect(block.x, block.y, block.width, block.height)

      // Regenerating block highlight
      ctx.fillStyle = `rgba(255, 255, 255, ${displayOpacity * 0.3})`
      ctx.fillRect(block.x, block.y, block.width, 3)
      ctx.fillRect(block.x, block.y, 3, block.height)

      // Regenerating block border - thicker when hittable
      ctx.strokeStyle = `rgba(192, 57, 43, ${displayOpacity})`
      ctx.lineWidth = isHittable ? 2 : 1
      ctx.strokeRect(block.x, block.y, block.width, block.height)
      
      // Add pulsing effect when hittable but not fully solid
      if (isHittable && block.opacity < 1.0) {
        const pulse = 0.3 + 0.2 * Math.sin(Date.now() * 0.01)
        ctx.strokeStyle = `rgba(255, 255, 0, ${pulse})`
        ctx.lineWidth = 1
        ctx.setLineDash([2, 2])
        ctx.strokeRect(block.x - 1, block.y - 1, block.width + 2, block.height + 2)
        ctx.setLineDash([])
      }
    })
  }

  const drawStubbornBlocks = (ctx: CanvasRenderingContext2D, stubbornBlocks: Array<{ x: number; y: number; width: number; height: number }>) => {
    stubbornBlocks.forEach(block => {
      // Stubborn block shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
      ctx.fillRect(block.x + 2, block.y + 2, block.width, block.height)

      // Stubborn block body (dark gray/black)
      ctx.fillStyle = '#2C3E50' // Dark gray
      ctx.fillRect(block.x, block.y, block.width, block.height)

      // Stubborn block highlight (minimal)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'
      ctx.fillRect(block.x, block.y, block.width, 2)
      ctx.fillRect(block.x, block.y, 2, block.height)

      // Stubborn block border (thick and dark)
      ctx.strokeStyle = '#1A252F'
      ctx.lineWidth = 2
      ctx.strokeRect(block.x, block.y, block.width, block.height)

      // Add "X" pattern to indicate it can't be destroyed
      ctx.strokeStyle = '#E74C3C'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(block.x + 5, block.y + 5)
      ctx.lineTo(block.x + block.width - 5, block.y + block.height - 5)
      ctx.moveTo(block.x + block.width - 5, block.y + 5)
      ctx.lineTo(block.x + 5, block.y + block.height - 5)
      ctx.stroke()
    })
  }

  const drawCenteredText = (
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    color: string,
    font: string
  ) => {
    ctx.font = `${font} Courier New, monospace`
    ctx.fillStyle = color
    ctx.textAlign = 'center'
    ctx.fillText(text, x / 2, y / 2)
    ctx.textAlign = 'left' // Reset alignment
  }

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        border: '3px solid #34495e',
        borderRadius: '8px',
        background: '#0a0a0a',
        imageRendering: 'pixelated'
      }}
    />
  )
}

export default BlockBreakerRenderer