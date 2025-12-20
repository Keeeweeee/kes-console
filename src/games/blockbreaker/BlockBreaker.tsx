// Block Breaker - Main game component with AI integration

import { useState, useEffect, useCallback, useRef } from 'react'
import { BlockBreakerGame } from './BlockBreakerGame'
import BlockBreakerRenderer from './BlockBreakerRenderer'
import { BlockBreakerAIAnalyzer, BlockBreakerAIState } from '../../ai/blockbreaker/BlockBreakerAIAnalyzer'
import { BlockBreakerGameEvent } from '../../ai/blockbreaker/BlockBreakerBehaviorTypes'
import KAI from '../../components/KAI'
import { useAudio } from '../../audio/useAudio'

interface BlockBreakerProps {
  onGameEnd: (result: 'won' | 'lost', duration: number, score: number) => void
  onAIStateChange: (aiState: BlockBreakerAIState) => void
}

const BlockBreaker: React.FC<BlockBreakerProps> = ({ onGameEnd, onAIStateChange }) => {
  const gameRef = useRef<BlockBreakerGame>()
  const aiAnalyzerRef = useRef<BlockBreakerAIAnalyzer>()
  const gameLoopRef = useRef<number>()
  const gameStartTimeRef = useRef<number>(0)
  const lastPaddleHitTimeRef = useRef<number>(0)
  
  const [gameData, setGameData] = useState(() => {
    const game = new BlockBreakerGame(800, 600)
    gameRef.current = game
    return game.getGameData()
  })

  const [aiState, setAIState] = useState<BlockBreakerAIState | null>(null)
  const { playSFX } = useAudio()

  const [keys, setKeys] = useState({
    left: false,
    right: false
  })

  // Initialize AI analyzer
  useEffect(() => {
    if (!aiAnalyzerRef.current) {
      aiAnalyzerRef.current = new BlockBreakerAIAnalyzer()
      const initialState = aiAnalyzerRef.current.initializeGame(800)
      setAIState(initialState)
      onAIStateChange(initialState)
    }
  }, [onAIStateChange])

  // Game loop
  const gameLoop = useCallback(() => {
    const game = gameRef.current
    const aiAnalyzer = aiAnalyzerRef.current
    if (!game || !aiAnalyzer) return

    // Handle paddle movement
    if (keys.left) {
      game.movePaddle('left')
    }
    if (keys.right) {
      game.movePaddle('right')
    }

    // Update game state
    const updateResult = game.update()
    const currentTime = Date.now()

    // Apply AI corruption effects before game update
    if (aiAnalyzerRef.current) {
      const ballSpeedMultiplier = aiAnalyzer.getBallSpeedMultiplier()
      const paddleWidthMultiplier = aiAnalyzer.getPaddleWidthMultiplier()
      const paddleDrift = aiAnalyzer.getPaddleDrift()
      const bounceAngleBias = aiAnalyzer.getBounceAngleBias()
      const fakeBlocks = aiAnalyzer.getFakeBlocks()
      const regeneratingBlocks = aiAnalyzer.getRegeneratingBlocks()
      
      // Apply effects to game
      game.applyCorruptionEffects({
        ballSpeedMultiplier,
        paddleWidthMultiplier,
        paddleDrift,
        bounceAngleBias
      })
      
      // Check fake block collisions
      const fakeBlockHit = game.checkFakeBlockCollision(fakeBlocks)
      if (fakeBlockHit) {
        aiAnalyzer.onFakeBlockHit(fakeBlockHit.x, fakeBlockHit.y)
      }
      
      // Check regenerating block collisions
      const regenBlockHit = game.checkRegeneratingBlockCollision(regeneratingBlocks)
      if (regenBlockHit) {
        aiAnalyzer.onRegeneratingBlockHit(regenBlockHit.x, regenBlockHit.y)
        // Treat as block hit for scoring
        updateResult.blockHit = true
      }
      
      // Check stubborn block collisions
      const stubbornBlocks = aiAnalyzer.getStubbornBlocks()
      const stubbornBlockHit = game.checkStubbornBlockCollision(stubbornBlocks)
      if (stubbornBlockHit) {
        aiAnalyzer.onStubbornBlockHit()
      }
      
      // Add fully regenerated blocks as real blocks
      const fullyRegenerated = aiAnalyzer.getFullyRegeneratedBlocks()
      if (fullyRegenerated.length > 0) {
        game.addRegeneratedBlocks(fullyRegenerated)
        // Update the game data to reflect new block count
        setGameData(game.getGameData())
      }
    }

    // Process AI events asynchronously to prevent game pausing
    if (updateResult.ballMissed && updateResult.ballPosition) {
      const event: BlockBreakerGameEvent = {
        type: 'ball_missed',
        timestamp: currentTime,
        data: {
          ballPosition: updateResult.ballPosition,
          blocksRemaining: updateResult.blocksRemaining
        }
      }
      // Process asynchronously
      setTimeout(() => {
        const newAIState = aiAnalyzer.processGameEvent(event)
        setAIState(newAIState)
        onAIStateChange(newAIState)
      }, 0)
    }

    if (updateResult.paddleHit && updateResult.paddlePosition !== undefined) {
      const reactionTime = lastPaddleHitTimeRef.current > 0 
        ? currentTime - lastPaddleHitTimeRef.current 
        : 0
      
      const event: BlockBreakerGameEvent = {
        type: 'paddle_hit',
        timestamp: currentTime,
        data: {
          paddlePosition: updateResult.paddlePosition,
          reactionTime
        }
      }
      // Process asynchronously
      setTimeout(() => {
        const newAIState = aiAnalyzer.processGameEvent(event)
        setAIState(newAIState)
        onAIStateChange(newAIState)
      }, 0)
      
      lastPaddleHitTimeRef.current = currentTime
    }

    if (updateResult.blockHit) {
      const event: BlockBreakerGameEvent = {
        type: 'block_hit',
        timestamp: currentTime,
        data: {
          blocksRemaining: updateResult.blocksRemaining,
          score: game.getScore()
        }
      }
      // Process asynchronously
      setTimeout(() => {
        const newAIState = aiAnalyzer.processGameEvent(event)
        setAIState(newAIState)
        onAIStateChange(newAIState)
      }, 0)
    }

    // Check win condition - only real blocks count, fake/stubborn blocks don't prevent winning
    if (aiAnalyzerRef.current && updateResult.blocksRemaining !== undefined) {
      // Win when all real blocks are destroyed (corruption blocks don't count)
      if (updateResult.blocksRemaining === 0) {
        const gameData = game.getGameData()
        if (gameData.gameState === 'playing') {
          game.setGameWon()
          updateResult.gameWon = true
        }
      }
    }

    // Check for game end
    const currentState = game.getGameState()
    if (currentState === 'game_over' || currentState === 'won') {
      const duration = currentTime - gameStartTimeRef.current
      const score = game.getScore()
      const result = currentState === 'won' ? 'won' : 'lost'
      
      // Play appropriate sound effect
      playSFX(result === 'won' ? 'youWin' : 'gameOver', 'block-breaker');
      
      // Send game end event to AI
      const event: BlockBreakerGameEvent = {
        type: 'game_end',
        timestamp: currentTime,
        data: {
          score,
          blocksRemaining: game.getRemainingBlocks()
        }
      }
      const newAIState = aiAnalyzer.processGameEvent(event)
      setAIState(newAIState)
      onAIStateChange(newAIState)
      
      onGameEnd(result, duration, score)
      
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current)
        gameLoopRef.current = undefined
      }
    } else {
      gameLoopRef.current = requestAnimationFrame(gameLoop)
    }

    setGameData(game.getGameData())
  }, [keys, onGameEnd, onAIStateChange])

  // Keyboard event handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const game = gameRef.current
      const aiAnalyzer = aiAnalyzerRef.current
      if (!game || !aiAnalyzer) return

      switch (e.code) {
        case 'ArrowLeft':
          e.preventDefault()
          setKeys(prev => ({ ...prev, left: true }))
          break
        case 'ArrowRight':
          e.preventDefault()
          setKeys(prev => ({ ...prev, right: true }))
          break
        case 'Space':
          e.preventDefault()
          if (game.getGameState() === 'waiting') {
            game.startGame()
            gameStartTimeRef.current = Date.now()
            lastPaddleHitTimeRef.current = 0
            
            // Send game start event to AI
            const event: BlockBreakerGameEvent = {
              type: 'game_start',
              timestamp: Date.now()
            }
            const newAIState = aiAnalyzer.processGameEvent(event)
            setAIState(newAIState)
            onAIStateChange(newAIState)
            
            if (!gameLoopRef.current) {
              gameLoopRef.current = requestAnimationFrame(gameLoop)
            }
          } else if (game.getGameState() === 'paused') {
            game.resumeGame()
            if (!gameLoopRef.current) {
              gameLoopRef.current = requestAnimationFrame(gameLoop)
            }
          } else if (game.getGameState() === 'playing') {
            game.pauseGame()
            if (gameLoopRef.current) {
              cancelAnimationFrame(gameLoopRef.current)
              gameLoopRef.current = undefined
            }
          }
          break
        case 'KeyR':
          if (game.getGameState() === 'game_over' || game.getGameState() === 'won') {
            game.resetGame()
            // Reset AI corruption
            if (aiAnalyzer) {
              aiAnalyzer.resetCorruption()
              const resetState = aiAnalyzer.initializeGame(800)
              setAIState(resetState)
              onAIStateChange(resetState)
            }
            setGameData(game.getGameData())
          }
          break
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'ArrowLeft':
          setKeys(prev => ({ ...prev, left: false }))
          break
        case 'ArrowRight':
          setKeys(prev => ({ ...prev, right: false }))
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current)
      }
    }
  }, [gameLoop, onAIStateChange])

  // Mouse control for paddle
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const game = gameRef.current
    if (!game || game.getGameState() !== 'playing') return

    const target = e.currentTarget.querySelector('canvas')
    if (!target) return
    
    const rect = target.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    
    game.setPaddlePosition(mouseX)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current)
      }
    }
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      background: '#c0c0c0',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '20px',
      padding: '20px'
    }}>
      <div 
        onMouseMove={handleMouseMove}
        style={{ cursor: gameData.gameState === 'playing' ? 'none' : 'default' }}
      >
        <BlockBreakerRenderer 
          gameData={gameData}
          aiState={aiState}
          width={800}
          height={600}
        />
      </div>
      
      {/* KAI Avatar and Commentary */}
      <KAI commentary={aiState?.commentary} />
      
      <div style={{
        color: '#000000',
        fontSize: '12px',
        textAlign: 'center',
        fontFamily: 'Courier New, monospace',
        lineHeight: '1.4',
        background: '#808080',
        padding: '8px 16px',
        border: '2px inset #c0c0c0'
      }}>
        <div>ARROW KEYS or MOUSE: Move Paddle</div>
        <div>SPACE: Start/Pause | R: Restart</div>
      </div>
    </div>
  )
}

export default BlockBreaker