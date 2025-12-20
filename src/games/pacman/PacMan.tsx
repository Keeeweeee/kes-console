import React, { useState, useEffect, useRef } from 'react';
import { PacManGame, GameState, Direction } from './PacManGame';
import PacManRenderer from './PacManRenderer';
import { PacManAIAnalyzer, PacManAIState } from '../../ai/pacman/PacManAIAnalyzer';
import KAI from '../../components/KAI';
import { useAudio } from '../../audio/useAudio';

interface PacManProps {
  onGameEnd?: (result: 'won' | 'lost', duration: number, score: number) => void;
  onAIStateChange?: (aiState: PacManAIState) => void;
}

const PacMan: React.FC<PacManProps> = ({ onGameEnd, onAIStateChange }) => {
  const gameRef = useRef<PacManGame | null>(null);
  const aiAnalyzerRef = useRef<PacManAIAnalyzer | null>(null);
  const [gameData, setGameData] = useState(() => {
    const game = new PacManGame();
    return game.getGameData();
  });
  const [aiState, setAIState] = useState<PacManAIState | null>(null);
  const { playSFX } = useAudio();

  // Initialize game and AI analyzer
  useEffect(() => {
    gameRef.current = new PacManGame();
    aiAnalyzerRef.current = new PacManAIAnalyzer();

    // Set up keyboard controls
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!gameRef.current) return;

      let direction: Direction = Direction.NONE;
      
      switch (event.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          direction = Direction.UP;
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          direction = Direction.DOWN;
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          direction = Direction.LEFT;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          direction = Direction.RIGHT;
          break;
      }

      if (direction !== Direction.NONE) {
        event.preventDefault();
        gameRef.current.setDirection(direction);
      }
    };

    document.addEventListener('keydown', handleKeyPress);

    return () => {
      document.removeEventListener('keydown', handleKeyPress);
      if (gameRef.current) {
        gameRef.current.destroy();
      }
    };
  }, []);

  // Game state update loop
  useEffect(() => {
    const updateInterval = setInterval(() => {
      if (gameRef.current && aiAnalyzerRef.current) {
        const prevGameData = gameData;
        const newGameData = gameRef.current.getGameData();
        setGameData(newGameData);

        // Handle game state changes
        if (prevGameData.gameState === GameState.READY && newGameData.gameState === GameState.PLAYING) {
          // Game started
          const newAIState = aiAnalyzerRef.current.onGameStart(newGameData);
          setAIState(newAIState);
          onAIStateChange?.(newAIState);
        } else if (newGameData.gameState === GameState.PLAYING) {
          // Game update - let AI control ghosts and analyze behavior
          const { aiState: newAIState, ghostMoves, chainAttempts, speechTriggers } = aiAnalyzerRef.current.onGameUpdate(newGameData);
          
          // First, attempt lookahead chaining for ghosts with active segments
          for (const [ghostId, direction] of chainAttempts) {
            gameRef.current.tryChainGhostSegment(ghostId, direction);
          }
          
          // Then, apply moves for idle ghosts
          for (const [ghostId, direction] of ghostMoves) {
            gameRef.current.moveGhost(ghostId, direction);
          }
          
          // Finally, trigger speech bubbles
          for (const [ghostId, speechText] of speechTriggers) {
            gameRef.current.addSpeechBubble(ghostId, speechText);
          }
          
          setAIState(newAIState);
          onAIStateChange?.(newAIState);
        } else if (
          (prevGameData.gameState === GameState.PLAYING && newGameData.gameState === GameState.WON) ||
          (prevGameData.gameState === GameState.PLAYING && newGameData.gameState === GameState.LOST)
        ) {
          // Game ended
          const result = newGameData.gameState === GameState.WON ? 'won' : 'lost';
          const duration = gameRef.current.getGameDuration();
          const score = gameRef.current.getScore();
          
          // Play appropriate sound effect
          playSFX(result === 'won' ? 'youWin' : 'gameOver', 'snake');
          
          const newAIState = aiAnalyzerRef.current.onGameEnd(newGameData, result);
          setAIState(newAIState);
          onAIStateChange?.(newAIState);
          onGameEnd?.(result, duration, score);
        }

        // Check for Pac-Man death (lives decreased or entering death pause)
        if (prevGameData.lives > newGameData.lives && 
            (newGameData.gameState === GameState.DEATH_PAUSE || newGameData.gameState === GameState.PLAYING)) {

              playSFX('gameOver', 'pacman');
          // Use the tracked killer ghost from game data
          const killerGhostId = newGameData.lastKillerGhost || 'unknown';
          
          const newAIState = aiAnalyzerRef.current.onPacManDeath(newGameData, killerGhostId);
          setAIState(newAIState);
          onAIStateChange?.(newAIState);
        }
      }
    }, 150); // Slightly slower update rate for smoother feel

    return () => clearInterval(updateInterval);
  }, [onGameEnd, onAIStateChange, gameData]);

  const handleStart = () => {
    if (gameRef.current) {
      gameRef.current.start();
    }
  };

  const handleReset = () => {
    if (gameRef.current && aiAnalyzerRef.current) {
      gameRef.current.reset();
      setGameData(gameRef.current.getGameData());
      setAIState(null);
    }
  };

  const getGameStateDisplay = () => {
    switch (gameData.gameState) {
      case GameState.READY:
        return 'READY TO START';
      case GameState.PLAYING:
        return 'PLAYING';
      case GameState.DEATH_PAUSE:
        return 'OUCH!';
      case GameState.PAUSED:
        return 'PAUSED';
      case GameState.WON:
        return 'LEVEL COMPLETE!';
      case GameState.LOST:
        return 'GAME OVER';
      default:
        return 'UNKNOWN';
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#c0c0c0',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '20px',
      padding: '20px',
      fontFamily: 'Courier New, monospace',
      color: '#000000'
    }}>
      {/* Game Info */}
      <div style={{
        display: 'flex',
        gap: '30px',
        fontSize: '14px',
        color: '#000000',
        background: '#808080',
        padding: '8px 16px',
        border: '2px outset #c0c0c0'
      }}>
        <div>SCORE: {gameData.score}</div>
        <div>LIVES: {gameData.lives}</div>
        <div>PELLETS: {gameData.pelletsRemaining}</div>
        <div>STATUS: {getGameStateDisplay()}</div>
        {gameData.powerPelletActive && (
          <div style={{ color: '#ffff00' }}>
            POWER: {Math.ceil(gameData.powerPelletTimer / 1000)}s
          </div>
        )}
      </div>

      {/* Game Board */}
      <PacManRenderer 
        gameData={gameData} 
        cellSize={30}
      />

      {/* Controls */}
      <div style={{
        display: 'flex',
        gap: '15px',
        alignItems: 'center'
      }}>
        {gameData.gameState === GameState.READY && (
          <button
            onClick={handleStart}
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
            onMouseEnter={(e) => { e.currentTarget.style.background = '#d0d0d0' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#c0c0c0' }}
            onMouseDown={(e) => { e.currentTarget.style.border = '2px inset #c0c0c0' }}
            onMouseUp={(e) => { e.currentTarget.style.border = '2px outset #c0c0c0' }}
          >
            START GAME
          </button>
        )}

        <button
          onClick={handleReset}
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
          onMouseEnter={(e) => { e.currentTarget.style.background = '#d0d0d0' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#c0c0c0' }}
          onMouseDown={(e) => { e.currentTarget.style.border = '2px inset #c0c0c0' }}
          onMouseUp={(e) => { e.currentTarget.style.border = '2px outset #c0c0c0' }}
        >
          NEW GAME
        </button>
      </div>

      {/* Instructions */}
      <div style={{
        textAlign: 'center',
        fontSize: '12px',
        color: '#000000',
        lineHeight: '1.4',
        background: '#808080',
        padding: '8px 16px',
        border: '2px inset #c0c0c0'
      }}>
        <div>Use ARROW KEYS or WASD to move Pac-Man</div>
        <div>Eat all pellets while avoiding ghosts</div>
        <div>Power pellets make ghosts vulnerable!</div>
      </div>

      {/* KAI Avatar and Commentary */}
      <KAI commentary={aiState?.commentary} />

      {/* Ghost Personality Display */}
      {aiState && aiState.ghostPersonalities.length > 0 && (
        <div style={{
          fontSize: '10px',
          color: '#000000',
          fontStyle: 'italic',
          textAlign: 'center',
          maxWidth: '500px',
          background: '#808080',
          padding: '8px 16px',
          border: '2px inset #c0c0c0'
        }}>
          <div>Player Behavior: {aiState.playerBehavior.toUpperCase()}</div>
          <div style={{ marginTop: '5px' }}>
            {aiState.ghostPersonalities.map(ghost => (
              <div key={ghost.ghostId}>
                {ghost.ghostId.toUpperCase()}: {ghost.currentBehavior}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PacMan;