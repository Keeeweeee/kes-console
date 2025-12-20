import React, { useState, useEffect, useRef } from 'react';
import { SnakeGame, GameState } from './SnakeGame';
import { SnakeInputHandler } from './SnakeInputHandler';
import SnakeRenderer from './SnakeRenderer';
import { SnakeAIAnalyzer, SnakeAIState } from '../../ai/snake/SnakeAIAnalyzer';
import KAI from '../../components/KAI';
import { useAudio } from '../../audio/useAudio';

interface SnakeProps {
  onGameEnd?: (score: number, duration: number, moveCount: number) => void;
  onAIStateChange?: (aiState: SnakeAIState) => void;
}

const Snake: React.FC<SnakeProps> = ({ onGameEnd, onAIStateChange }) => {
  const gameRef = useRef<SnakeGame | null>(null);
  const inputHandlerRef = useRef<SnakeInputHandler | null>(null);
  const aiAnalyzerRef = useRef<SnakeAIAnalyzer | null>(null);
  const [gameData, setGameData] = useState(() => {
    const game = new SnakeGame(20, 20);
    return game.getGameData();
  });
  const [aiState, setAIState] = useState<SnakeAIState | null>(null);
  const [currentCommentary, setCurrentCommentary] = useState("► AI SYSTEM READY");
  const [commentaryQueue, setCommentaryQueue] = useState<string[]>([]);
  const [isPlayingCommentary, setIsPlayingCommentary] = useState(false);
  const [lastCommentaryTime, setLastCommentaryTime] = useState(0);
  const { playSFX } = useAudio();

  // Initialize game, input handler, and AI analyzer
  useEffect(() => {
    gameRef.current = new SnakeGame(20, 20);
    inputHandlerRef.current = new SnakeInputHandler();
    aiAnalyzerRef.current = new SnakeAIAnalyzer();

    inputHandlerRef.current.setCallback((direction) => {
      if (gameRef.current) {
        gameRef.current.setDirection(direction);
      }
    });

    // Set up AI callbacks for corruption system
    if (gameRef.current && aiAnalyzerRef.current) {
      gameRef.current.setAIUpdateCallback((snake, food, gridWidth, gridHeight, snakeLength) => {
        if (aiAnalyzerRef.current) {
          return aiAnalyzerRef.current.onGameUpdate(snake, food, gridWidth, gridHeight, snakeLength);
        }
        return {
          speedMultiplier: 1.0,
          fakeFoods: [],
          environmentalBlocks: [],
          foodSpawnBias: { wallBias: 0, bodyBias: 0, safeSpaceReduction: 0 },
          environmentalEffects: {
            colorShift: 0,
            gridTension: false,
            foodPulseRate: 1.0
          },
          hasWon: false,
          commentaryEvents: []
        };
      });

      gameRef.current.setFakeFoodApproachedCallback((position) => {
        if (aiAnalyzerRef.current) {
          const result = aiAnalyzerRef.current.onFakeFoodApproached(position);
          // Queue commentary event if present
          if (result.commentaryEvent) {
            // Will be handled by UI commentary queue
          }
          return { disappeared: result.disappeared, commentary: null };
        }
        return { disappeared: false, commentary: null };
      });

      gameRef.current.setRealFoodEatenCallback(() => {
        if (aiAnalyzerRef.current) {
          aiAnalyzerRef.current.onRealFoodEaten();
        }
      });

      gameRef.current.setBiasedFoodCallback((snake, gridWidth, gridHeight, normalPosition) => {
        if (aiAnalyzerRef.current) {
          return aiAnalyzerRef.current.generateBiasedFoodPosition(snake, gridWidth, gridHeight, normalPosition);
        }
        return normalPosition;
      });
    }

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy();
      }
      if (inputHandlerRef.current) {
        inputHandlerRef.current.destroy();
      }
    };
  }, []);

  // Game state update loop with AI integration
  useEffect(() => {
    const updateInterval = setInterval(() => {
      if (gameRef.current && aiAnalyzerRef.current) {
        const prevGameData = gameData;
        const newGameData = gameRef.current.getGameData();
        setGameData(newGameData);

        // Track moves for AI analysis and update AI state
        if (newGameData.gameState === GameState.PLAYING && 
            newGameData.moveCount > prevGameData.moveCount) {
          
          const currentDirection = gameRef.current.getCurrentDirection();
          aiAnalyzerRef.current.onMove(
            currentDirection,
            newGameData.snake[0],
            newGameData.snake.length,
            newGameData.food,
            newGameData.gridWidth,
            newGameData.gridHeight
          );

          // Update AI state during gameplay
          const currentAIState = aiAnalyzerRef.current.getCurrentAIState();
          setAIState(currentAIState);
          onAIStateChange?.(currentAIState);
        }

        // Handle game over
        if (newGameData.gameState === GameState.GAME_OVER && 
            prevGameData.gameState === GameState.PLAYING) {
          
          const score = gameRef.current.getScore();
          const duration = gameRef.current.getGameDuration();
          const moveCount = gameRef.current.getMoveCount();
          
          // Get death cause from game data
          const deathCause = newGameData.deathCause;
          const hasWon = newGameData.hasWon;

          // Play appropriate sound effect
          playSFX(hasWon ? 'youWin' : 'gameOver', 'snake');

          // Update AI state
          const newAIState = aiAnalyzerRef.current.onGameEnd(score, deathCause, hasWon);
          setAIState(newAIState);
          onAIStateChange?.(newAIState);

          // Call original callback
          onGameEnd?.(score, duration, moveCount);
        }
      }
    }, 50); // Update UI more frequently than game logic

    return () => clearInterval(updateInterval);
  }, [onGameEnd, onAIStateChange, gameData]);

  // UI OWNS COMMENTARY TIMELINE (for mid-game commentary only)

  const queueCommentary = (message: string, priority: 'low' | 'normal' | 'high' = 'normal') => {
    const now = Date.now();
    const cooldown = 3000; // 3 second cooldown
    
    // High priority bypasses cooldown and queue
    if (priority === 'high' || !isPlayingCommentary) {
      if (priority === 'high' || now - lastCommentaryTime >= cooldown) {
        setCurrentCommentary(message);
        setLastCommentaryTime(now);
        return;
      }
    }
    
    // Queue for later
    setCommentaryQueue(prev => [...prev, message]);
  };

  // Process commentary queue
  useEffect(() => {
    if (!isPlayingCommentary && commentaryQueue.length > 0) {
      const now = Date.now();
      if (now - lastCommentaryTime >= 3000) {
        const nextMessage = commentaryQueue[0];
        setCommentaryQueue(prev => prev.slice(1));
        setCurrentCommentary(nextMessage);
        setLastCommentaryTime(now);
      }
    }
  }, [commentaryQueue, isPlayingCommentary, lastCommentaryTime]);

  // Game over commentary is now displayed in the popup, no sequential display needed

  // Handle mid-game commentary events
  useEffect(() => {
    if (aiState?.commentaryEvents && aiState.commentaryEvents.length > 0) {
      aiState.commentaryEvents.forEach(event => {
        queueCommentary(event.message, event.priority);
      });
    }
  }, [aiState?.commentaryEvents]);

  const handleStart = () => {
    if (gameRef.current && inputHandlerRef.current && aiAnalyzerRef.current) {
      gameRef.current.start();
      inputHandlerRef.current.activate();
      
      // Start AI analysis
      const newAIState = aiAnalyzerRef.current.onGameStart();
      setAIState(newAIState);
      
      // Handle start commentary
      if (newAIState.commentaryEvents.length > 0) {
        queueCommentary(newAIState.commentaryEvents[0].message, newAIState.commentaryEvents[0].priority);
      }
      
      onAIStateChange?.(newAIState);
    }
  };

  const handleReset = () => {
    if (gameRef.current && inputHandlerRef.current && aiAnalyzerRef.current) {
      // Clean reset of all systems
      gameRef.current.reset();
      inputHandlerRef.current.deactivate();
      
      // Reset AI state to initial state
      const resetAIState: SnakeAIState = {
        behaviorType: aiAnalyzerRef.current.getBehaviorType(),
        metrics: aiAnalyzerRef.current.getBehaviorMetrics(),
        isActive: false,
        corruptionLevel: 0,
        speedMultiplier: 1.0,
        fakeFoods: [],
        environmentalBlocks: [],
        environmentalEffects: {
          colorShift: 0,
          gridTension: false,
          foodPulseRate: 1.0
        },
        commentaryEvents: [],
        gameOverState: {
          isGameOver: false,
          hasWon: false,
          analysis: null
        }
      };
      
      // Reset commentary state
      setCurrentCommentary("► AI SYSTEM READY");
      setCommentaryQueue([]);
      setIsPlayingCommentary(false);
      setLastCommentaryTime(0);
      
      setAIState(resetAIState);
      onAIStateChange?.(resetAIState);
      setGameData(gameRef.current.getGameData());
    }
  };

  const getGameStateDisplay = () => {
    switch (gameData.gameState) {
      case GameState.READY:
        return 'READY TO START';
      case GameState.PLAYING:
        return 'PLAYING';
      case GameState.GAME_OVER:
        return 'GAME OVER';
      default:
        return 'UNKNOWN';
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#838383ff',
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
        border: '2px outset #c0c0c0',
        borderRadius: '0'
      }}>
        <div>SCORE: {gameData.score}</div>
        <div>LENGTH: {gameData.snake.length}</div>
        <div>MOVES: {gameData.moveCount}</div>
        <div>STATUS: {getGameStateDisplay()}</div>
      </div>

      {/* Game Over Screen */}
      {gameData.gameState === GameState.GAME_OVER && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          fontFamily: 'Courier New, monospace',
          color: '#000000'
        }}>
          <div style={{
            textAlign: 'left',
            padding: '40px',
            backgroundColor: '#c0c0c0',
            borderRadius: '0',
            border: gameData.hasWon ? '3px outset #00ff00' : '3px outset #808080',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            maxWidth: '600px',
            minWidth: '400px'
          }}>
            {gameData.hasWon ? (
              <>
                <div style={{ textAlign: 'center', fontSize: '48px', marginBottom: '20px' }}>👑</div>
                <div style={{ textAlign: 'center', fontSize: '32px', fontWeight: 'bold', color: '#00ff00', marginBottom: '30px' }}>
                  YOU WIN!
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', fontSize: '32px', fontWeight: 'bold', color: '#000000', marginBottom: '30px' }}>
                GAME OVER
              </div>
            )}
            
            <div style={{ textAlign: 'center', fontSize: '18px', marginBottom: '10px' }}>
              SCORE: {gameData.score} | LENGTH: {gameData.snake.length}
            </div>
            
            {/* AI Analysis Section */}
            {aiState?.gameOverState?.analysis && (
              <div style={{
                marginTop: '30px',
                padding: '20px',
                backgroundColor: '#808080',
                borderRadius: '0',
                border: '2px inset #c0c0c0'
              }}>
                <div style={{ 
                  fontSize: '16px', 
                  fontWeight: 'bold', 
                  color: '#000000', 
                  marginBottom: '15px',
                  textAlign: 'center'
                }}>
                  ► AI ANALYSIS
                </div>
                
                <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
                  <div style={{ marginBottom: '12px' }}>
                    <span style={{ color: '#000000', fontWeight: 'bold' }}>Death: </span>
                    <span style={{ color: '#000000' }}>{aiState.gameOverState.analysis.death}</span>
                  </div>
                  
                  {aiState.gameOverState.analysis.corruption && (
                    <div style={{ marginBottom: '12px' }}>
                      <span style={{ color: '#000000', fontWeight: 'bold' }}>Corruption: </span>
                      <span style={{ color: '#000000' }}>{aiState.gameOverState.analysis.corruption}</span>
                    </div>
                  )}
                  
                  <div style={{ marginBottom: '12px' }}>
                    <span style={{ color: '#000000', fontWeight: 'bold' }}>Score: </span>
                    <span style={{ color: '#000000' }}>{aiState.gameOverState.analysis.score}</span>
                  </div>
                  
                  {aiState.gameOverState.analysis.recommendation && (
                    <div style={{ marginBottom: '12px' }}>
                      <span style={{ color: '#000000', fontWeight: 'bold' }}>Recommendation: </span>
                      <span style={{ color: '#000000' }}>{aiState.gameOverState.analysis.recommendation}</span>
                    </div>
                  )}
                  
                  {aiState.gameOverState.analysis.note && (
                    <div style={{ marginBottom: '12px' }}>
                      <span style={{ color: '#000000', fontWeight: 'bold' }}>Note: </span>
                      <span style={{ color: '#000000' }}>{aiState.gameOverState.analysis.note}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div style={{ textAlign: 'center', marginTop: '30px' }}>
              <button
                onClick={handleReset}
                style={{
                  background: '#c0c0c0',
                  color: '#000000',
                  border: '2px outset #c0c0c0',
                  borderRadius: '0',
                  padding: '12px 24px',
                  fontFamily: 'Courier New, monospace',
                  fontSize: '14px',
                  cursor: 'pointer',
                  letterSpacing: '1px',
                  transition: 'all 0.1s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#d0d0d0' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#c0c0c0' }}
                onMouseDown={(e) => { e.currentTarget.style.border = '2px inset #c0c0c0' }}
                onMouseUp={(e) => { e.currentTarget.style.border = '2px outset #c0c0c0' }}
              >
                RESTART
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KAI SECTION */}
      <KAI commentary={currentCommentary} />


      {/* Game Canvas */}
      <SnakeRenderer 
        gameData={gameData} 
        cellSize={20}
        shouldShowFakeFood={() => aiAnalyzerRef.current?.shouldShowFakeFood() || false}
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

        {(gameData.gameState === GameState.GAME_OVER || gameData.gameState === GameState.PLAYING) && (
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
            RESET GAME
          </button>
        )}
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
        <div>Use ARROW KEYS or WASD to control the snake</div>
        <div>Eat the red food to grow and increase your score</div>
        <div>Avoid hitting walls or yourself!</div>
      </div>

      {/* AI Analysis Display */}
      {aiState && (
        <div style={{
          fontSize: '10px',
          color: '#000000',
          fontStyle: 'italic',
          textAlign: 'center',
          maxWidth: '400px',
          background: '#808080',
          padding: '8px 16px',
          border: '2px inset #c0c0c0'
        }}>
          <div>Behavior: {aiState.behaviorType.toUpperCase()}</div>
          <div>Sessions: {aiState.metrics.totalSessions} | Best: {aiState.metrics.bestScore}</div>
          <div>Corruption Level: {aiState.corruptionLevel}</div>
          {aiState.speedMultiplier > 1.0 && (
            <div style={{ color: '#000000' }}>Speed: {aiState.speedMultiplier.toFixed(1)}x</div>
          )}
          {aiState.fakeFoods.length > 0 && (
            <div style={{ color: '#000000' }}>Fake Foods: {aiState.fakeFoods.length}</div>
          )}
          {aiState.metrics.averageReactionTime > 0 && (
            <div>Avg Reaction: {Math.round(aiState.metrics.averageReactionTime)}ms</div>
          )}
        </div>
      )}

      {/* CSS for commentary animation */}
      <style>{`
        @keyframes pulse {
          0% { transform: translate(-50%, -50%) scale(0.9); opacity: 0.8; }
          50% { transform: translate(-50%, -50%) scale(1.05); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default Snake;