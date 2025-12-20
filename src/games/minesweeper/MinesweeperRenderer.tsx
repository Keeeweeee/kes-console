import React from 'react';
import { MinesweeperGameData, TileState, GameState } from './MinesweeperGame';

interface MinesweeperRendererProps {
  gameData: MinesweeperGameData;
  onTileClick: (row: number, col: number) => void;
  onTileRightClick: (row: number, col: number) => void;
  onTileHover?: (row: number, col: number) => void;
  onPlayAgain?: () => void;
  onExitToConsole?: () => void;
  cellSize?: number;
}

const MinesweeperRenderer: React.FC<MinesweeperRendererProps> = ({
  gameData,
  onTileClick,
  onTileRightClick,
  onTileHover,
  onPlayAgain,
  onExitToConsole,
  cellSize = 30
}) => {
  const getTileContent = (tile: any) => {
    if (tile.state === TileState.FLAGGED) {
      return '🚩';
    }
    
    if (tile.state === TileState.REVEALED) {
      if (tile.isMine) {
        return '💣';
      }
      if (tile.neighborMines > 0) {
        return tile.neighborMines.toString();
      }
      return '';
    }
    
    return '';
  };

  const getTileStyle = (tile: any) => {
    // Tiles are clickable if they're hidden or flagged AND game is not won/lost
    const isClickable = (tile.state === TileState.HIDDEN || tile.state === TileState.FLAGGED) &&
                       gameData.gameState !== GameState.WON && gameData.gameState !== GameState.LOST;
    
    const baseStyle: React.CSSProperties = {
      width: cellSize,
      height: cellSize,
      border: '2px solid',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '14px',
      fontWeight: 'bold',
      fontFamily: 'Courier New, monospace',
      cursor: isClickable ? 'pointer' : 'default',
      userSelect: 'none'
    };

    if (tile.state === TileState.HIDDEN) {
      return {
        ...baseStyle,
        backgroundColor: '#95a5a6',
        borderColor: '#7f8c8d',
        color: '#2c3e50'
      };
    }

    if (tile.state === TileState.FLAGGED) {
      return {
        ...baseStyle,
        backgroundColor: '#e74c3c',
        borderColor: '#c0392b',
        color: '#ffffff'
      };
    }

    // Revealed tile
    let backgroundColor = '#ecf0f1';
    let textColor = '#2c3e50';

    if (tile.isMine) {
      backgroundColor = '#e74c3c';
      textColor = '#ffffff';
    } else if (tile.neighborMines > 0) {
      // Color code numbers
      const colors = [
        '#3498db', // 1 - blue
        '#27ae60', // 2 - green  
        '#e74c3c', // 3 - red
        '#9b59b6', // 4 - purple
        '#f39c12', // 5 - orange
        '#e67e22', // 6 - dark orange
        '#1abc9c', // 7 - teal
        '#34495e'  // 8 - dark gray
      ];
      textColor = colors[tile.neighborMines - 1] || '#2c3e50';
    }

    return {
      ...baseStyle,
      backgroundColor,
      borderColor: '#bdc3c7',
      color: textColor
    };
  };

  const handleTileClick = (row: number, col: number, event: React.MouseEvent) => {
    event.preventDefault();
    if (event.button === 0) { // Left click
      onTileClick(row, col);
    }
  };

  const handleTileRightClick = (row: number, col: number, event: React.MouseEvent) => {
    event.preventDefault();
    onTileRightClick(row, col);
  };

  const handleTileHover = (row: number, col: number) => {
    if (onTileHover) {
      onTileHover(row, col);
    }
  };

  return (
    <div style={{
      position: 'relative',
      display: 'inline-block',
      border: '3px solid #34495e',
      borderRadius: '8px',
      padding: '10px',
      backgroundColor: '#2c3e50'
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${gameData.board[0]?.length || 0}, ${cellSize}px)`,
        gap: '1px',
        backgroundColor: '#7f8c8d',
        padding: '2px'
      }}>
        {gameData.board.map((row, rowIndex) =>
          row.map((tile, colIndex) => {
            // Tiles are clickable if they're hidden or flagged AND game is not won/lost
            const isClickable = (tile.state === TileState.HIDDEN || tile.state === TileState.FLAGGED) &&
                               gameData.gameState !== GameState.WON && gameData.gameState !== GameState.LOST;
            
            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                style={getTileStyle(tile)}
                onClick={isClickable ? (e) => handleTileClick(rowIndex, colIndex, e) : undefined}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (isClickable) {
                    handleTileRightClick(rowIndex, colIndex, e);
                  }
                }}
                onMouseEnter={isClickable && tile.state === TileState.HIDDEN ? () => handleTileHover(rowIndex, colIndex) : undefined}
                onMouseDown={(e) => e.preventDefault()}
              >
                {getTileContent(tile)}
              </div>
            );
          })
        )}
      </div>
      
      {/* Win Overlay */}
      {gameData.gameState === GameState.WON && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '8px'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
            border: '3px solid #1e8449',
            borderRadius: '12px',
            padding: '30px',
            textAlign: 'center',
            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.3)'
          }}>
            <h2 style={{
              color: '#ffffff',
              fontSize: '24px',
              fontWeight: 'bold',
              margin: '0 0 20px 0',
              letterSpacing: '2px',
              textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5)'
            }}>
              YOU WIN!
            </h2>
            
            <div style={{
              display: 'flex',
              gap: '15px',
              justifyContent: 'center'
            }}>
              <button
                onClick={onPlayAgain}
                style={{
                  background: '#3498db',
                  color: '#ffffff',
                  border: '2px solid #2980b9',
                  borderRadius: '6px',
                  padding: '12px 20px',
                  fontFamily: 'Courier New, monospace',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  letterSpacing: '1px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#2980b9';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#3498db';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                PLAY AGAIN
              </button>
              
              <button
                onClick={onExitToConsole}
                style={{
                  background: '#e74c3c',
                  color: '#ffffff',
                  border: '2px solid #c0392b',
                  borderRadius: '6px',
                  padding: '12px 20px',
                  fontFamily: 'Courier New, monospace',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  letterSpacing: '1px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#c0392b';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#e74c3c';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                EXIT TO CONSOLE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MinesweeperRenderer;