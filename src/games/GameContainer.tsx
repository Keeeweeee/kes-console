import { useParams, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import Snake from './snake/Snake'
import Minesweeper from './minesweeper/Minesweeper'
import PacMan from './pacman/PacMan'
import BlockBreaker from './blockbreaker/BlockBreaker'
import { SnakeAIState } from '../ai/snake/SnakeAIAnalyzer'
import { MinesweeperAIState } from '../ai/minesweeper/MinesweeperAIAnalyzer'
import { PacManAIState } from '../ai/pacman/PacManAIAnalyzer'
import { BlockBreakerAIState } from '../ai/blockbreaker/BlockBreakerAIAnalyzer'
import { useConsoleAI } from '../ai/console/ConsoleAIContext'
import { useAudio } from '../audio/useAudio'

// Game Engine - Container for all games
const GameContainer = () => {
  const { gameType } = useParams<{ gameType: string }>()
  const navigate = useNavigate()
  const { consoleAI } = useConsoleAI()
  const { playMusic, stopMusic } = useAudio()

  // Audio lifecycle management for games
  useEffect(() => {
    // Start game music when entering any game
    playMusic('game');

    // Cleanup: stop music when leaving game (back to dashboard)
    return () => {
      stopMusic();
    };
  }, []);

  useEffect(() => {
    // Future: Initialize game engine and behavior tracking
    console.log(`Loading game: ${gameType}`)
  }, [gameType])

  const handleBackToDashboard = () => {
    navigate('/')
  }

  const handleGameEnd = (score: number, duration: number, moveCount: number) => {
    // Send Snake game data to console AI
    if (gameType === 'snake' && consoleAI) {
      consoleAI.onSnakeGameEnd(score)
    }
    console.log('Game ended:', { score, duration, moveCount })
  }

  const handleMinesweeperGameEnd = (result: 'won' | 'lost' | 'abandoned', duration: number) => {
    console.log('Minesweeper ended:', { result, duration })
  }

  const handlePacManGameEnd = (result: 'won' | 'lost', duration: number, score: number) => {
    console.log('Pac-Man ended:', { result, duration, score })
  }

  const handleBlockBreakerGameEnd = (result: 'won' | 'lost', duration: number, score: number) => {
    console.log('Block Breaker ended:', { result, duration, score })
  }

  // AI state change handlers - no longer needed for commentary panels
  const handleSnakeAIStateChange = (_aiState: SnakeAIState) => {
    // KAI now handles commentary display within the game
  }

  const handleMinesweeperAIStateChange = (_aiState: MinesweeperAIState) => {
    // KAI now handles commentary display within the game
  }

  const handlePacManAIStateChange = (_aiState: PacManAIState) => {
    // KAI now handles commentary display within the game
  }

  const handleBlockBreakerAIStateChange = (_aiState: BlockBreakerAIState) => {
    // KAI now handles commentary display within the game
  }

  const renderGame = () => {
    switch (gameType) {
      case 'snake':
        return (
          <Snake 
            onGameEnd={handleGameEnd} 
            onAIStateChange={handleSnakeAIStateChange}
          />
        )

      case 'minesweeper':
        return (
          <Minesweeper 
            onGameEnd={handleMinesweeperGameEnd} 
            onAIStateChange={handleMinesweeperAIStateChange}
            onExitToConsole={handleBackToDashboard}
          />
        )
      
      case 'pacman':
        return (
          <PacMan 
            onGameEnd={handlePacManGameEnd} 
            onAIStateChange={handlePacManAIStateChange}
          />
        )

      case 'blockbreaker':
        return (
          <BlockBreaker 
            onGameEnd={handleBlockBreakerGameEnd} 
            onAIStateChange={handleBlockBreakerAIStateChange}
          />
        )
      
      default:
        return (
          <div style={{
            background: '#808080',
            border: '2px outset #c0c0c0',
            borderRadius: '0',
            padding: '30px',
            textAlign: 'center',
            maxWidth: '500px'
          }}>
            <h2 style={{ 
              color: '#000000', 
              marginBottom: '20px',
              letterSpacing: '2px'
            }}>
              UNKNOWN GAME
            </h2>
            <p style={{ 
              color: '#000000', 
              marginBottom: '30px',
              fontSize: '14px'
            }}>
              Game not found
            </p>
          </div>
        )
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#040436',
      color: '#000000',
      fontFamily: 'Courier New, monospace',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start'
    }}>
      {/* Header with back button */}
      <div style={{
        width: '100%',
        maxWidth: '800px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        padding: '15px 20px',
        background: '#808080',
        border: '2px outset #c0c0c0',
        borderRadius: '0',
        boxShadow: 'inset 0 1px 0 #ffffff, inset 0 -1px 0 #404040'
      }}>
        <button 
          onClick={handleBackToDashboard}
          style={{
            background: '#c0c0c0',
            color: '#000000',
            border: '2px outset #c0c0c0',
            borderRadius: '0',
            padding: '10px 20px',
            fontFamily: 'Courier New, monospace',
            fontSize: '12px',
            cursor: 'pointer',
            letterSpacing: '1px',
            transition: 'all 0.1s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#d0d0d0'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#c0c0c0'
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.border = '2px inset #c0c0c0'
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.border = '2px outset #c0c0c0'
          }}
        >
          ← BACK TO HOME
        </button>
        
        <h1 style={{
          margin: 0,
          color: '#000000',
          fontSize: '18px',
          letterSpacing: '2px'
        }}>
          {gameType?.toUpperCase() || 'GAME'}
        </h1>
        
        <div style={{ width: '120px' }}></div> {/* Spacer for centering */}
      </div>

      {/* Game Content */}
      <div style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'center'
      }}>
        {renderGame()}
      </div>
      
      <style>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}

export default GameContainer