import React, { useState, useEffect, useRef } from 'react';
import { MinesweeperGame, GameState } from './MinesweeperGame';
import MinesweeperRenderer from './MinesweeperRenderer';
import { MinesweeperAIAnalyzer, MinesweeperAIState } from '../../ai/minesweeper/MinesweeperAIAnalyzer';
import KAI from '../../components/KAI';
import { useAudio } from '../../audio/useAudio';

interface MinesweeperProps {
  onGameEnd?: (result: 'won' | 'lost' | 'abandoned', duration: number) => void;
  onAIStateChange?: (aiState: MinesweeperAIState) => void;
  onExitToConsole?: () => void;
}

const Minesweeper: React.FC<MinesweeperProps> = ({ onGameEnd, onAIStateChange, onExitToConsole }) => {
  const gameRef = useRef<MinesweeperGame | null>(null);
  const aiAnalyzerRef = useRef<MinesweeperAIAnalyzer | null>(null);
  const [gameData, setGameData] = useState(() => {
    const game = new MinesweeperGame(9, 9, 10);
    return game.getGameData();
  });
  const [aiState, setAIState] = useState<MinesweeperAIState | null>(null);
  const { playSFX } = useAudio();

  // Initialize game and AI analyzer
  useEffect(() => {
    gameRef.current = new MinesweeperGame(9, 9, 10);
    aiAnalyzerRef.current = new MinesweeperAIAnalyzer();

    return () => {
      // Cleanup on unmount
      if (aiAnalyzerRef.current && gameData.gameState === GameState.PLAYING) {
        aiAnalyzerRef.current.onGameEnd('abandoned');
      }
    };
  }, []);

  // Game state update loop
  useEffect(() => {
    const updateInterval = setInterval(() => {
      if (gameRef.current) {
        const newGameData = gameRef.current.getGameData();
        const prevGameState = gameData.gameState;
        setGameData(newGameData);

        // Handle game state changes
        if (aiAnalyzerRef.current) {
          if (prevGameState === GameState.READY && newGameData.gameState === GameState.PLAYING) {
            // Game started
            const newAIState = aiAnalyzerRef.current.onGameStart();
            setAIState(newAIState);
            onAIStateChange?.(newAIState);
          } else if (
            (prevGameState === GameState.PLAYING && newGameData.gameState === GameState.WON) ||
            (prevGameState === GameState.PLAYING && newGameData.gameState === GameState.LOST)
          ) {
            // Game ended
            const result = newGameData.gameState === GameState.WON ? 'won' : 'lost';
            const duration = gameRef.current.getGameDuration();
            
            // Play appropriate sound effect
            playSFX(result === 'won' ? 'youWin' : 'gameOver','minesweeper');
            
            const newAIState = aiAnalyzerRef.current.onGameEnd(result);
            setAIState(newAIState);
            onAIStateChange?.(newAIState);
            onGameEnd?.(result, duration);
          }
        }
      }
    }, 100);

    return () => clearInterval(updateInterval);
  }, [onGameEnd, onAIStateChange, gameData.gameState]);

  const handleTileClick = (row: number, col: number) => {
    if (!gameRef.current || !aiAnalyzerRef.current) return;

    gameRef.current.clickTile(row, col);
    const newGameData = gameRef.current.getGameData();
    const tile = newGameData.board[row][col];
    
    const result = tile.isMine ? 'mine' : 'safe';
    const newAIState = aiAnalyzerRef.current.onTileClick(row, col, 'click', result);
    setAIState(newAIState);
    onAIStateChange?.(newAIState);
  };

  const handleTileRightClick = (row: number, col: number) => {
    if (!gameRef.current || !aiAnalyzerRef.current) return;

    gameRef.current.flagTile(row, col);
    const newGameData = gameRef.current.getGameData();
    const tile = newGameData.board[row][col];
    
    // Determine if flag was correct (we can't know for sure until game ends, so estimate)
    const result = tile.isMine ? 'flag_correct' : 'flag_incorrect';
    const newAIState = aiAnalyzerRef.current.onTileClick(row, col, 'flag', result);
    setAIState(newAIState);
    onAIStateChange?.(newAIState);
  };

  const handleTileHover = (row: number, col: number) => {
    if (!gameRef.current || !aiAnalyzerRef.current) return;
    if (gameData.gameState !== GameState.PLAYING) return;
    
    // Get AI advice for this tile
    const newAIState = aiAnalyzerRef.current.onTileHover(
      row,
      col,
      (r, c) => gameRef.current!.calculateTileProbability(r, c)
    );
    setAIState(newAIState);
    onAIStateChange?.(newAIState);
  };

  const handleReset = () => {
    if (gameRef.current && aiAnalyzerRef.current) {
      // End current session if game was in progress
      if (gameData.gameState === GameState.PLAYING) {
        const newAIState = aiAnalyzerRef.current.onGameEnd('abandoned');
        setAIState(newAIState);
        onAIStateChange?.(newAIState);
      }

      gameRef.current.reset();
      setGameData(gameRef.current.getGameData());
    }
  };

  const handlePlayAgain = () => {
    handleReset();
  };

  const handleExitToConsole = () => {
    if (onExitToConsole) {
      onExitToConsole();
    }
  };

  const getGameStateDisplay = () => {
    switch (gameData.gameState) {
      case GameState.READY:
        return 'READY TO START';
      case GameState.PLAYING:
        return 'PLAYING';
      case GameState.WON:
        return 'VICTORY!';
      case GameState.LOST:
        return 'MINE DETONATED';
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
        <div>MINES: {gameRef.current?.getRemainingMines() || 0}</div>
        <div>FLAGS: {gameData.flagCount}</div>
        <div>STATUS: {getGameStateDisplay()}</div>
        {aiState && (
          <div>TRUST: {Math.round(aiState.trustLevel * 100)}%</div>
        )}
      </div>

      {/* Game Board */}
      <div>
        <div style={{ position: 'relative' }}>
          <MinesweeperRenderer
            gameData={gameData}
            onTileClick={handleTileClick}
            onTileRightClick={handleTileRightClick}
            onTileHover={handleTileHover}
            onPlayAgain={handlePlayAgain}
            onExitToConsole={handleExitToConsole}
            cellSize={30}
          />
        </div>
      </div>

      {/* Controls */}
      <div style={{
        display: 'flex',
        gap: '15px',
        alignItems: 'center'
      }}>
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
        <div>Left click to reveal tiles, right click to flag mines</div>
        <div>Hover over tiles for AI probability analysis</div>
        <div>Clear all non-mine tiles to win!</div>
      </div>

      {/* KAI Avatar and Commentary */}
      <KAI commentary={aiState?.commentary} />

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
          <div>Trust Level: {Math.round(aiState.trustLevel * 100)}%</div>
          <div>Deceptions: {aiState.deceptionCount}</div>
          <div>Sessions: {aiState.metrics.totalSessions}</div>
          {aiState.currentAdvice && (
            <div>
              Current Advice: {aiState.currentAdvice.aiSuggestion.toUpperCase()} 
              ({Math.round((1 - aiState.currentAdvice.probability) * 100)}% safe)
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Minesweeper;