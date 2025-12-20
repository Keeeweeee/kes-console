import React, { useEffect, useRef, useState } from 'react';
import { PacManGameData, CellType, Direction, GameState, MovementSegment, Position } from './PacManGame';

interface PacManRendererProps {
  gameData: PacManGameData;
  cellSize?: number;
}

const PacManRenderer: React.FC<PacManRendererProps> = ({
  gameData,
  cellSize = 20
}) => {
  const [, setRenderTick] = useState(0);
  const animationFrameRef = useRef<number>();

  // Smooth interpolation using requestAnimationFrame
  useEffect(() => {
    const animate = () => {
      // Force re-render on every frame
      setRenderTick(tick => tick + 1);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Shared interpolation helper for ALL entities
  const getInterpolatedPosition = (
    segment: MovementSegment | null,
    fallback: Position
  ): Position => {
    // No segment = render at exact tile position
    if (!segment || gameData.gameState === GameState.DEATH_PAUSE) {
      return fallback;
    }

    const now = Date.now();
    const t = Math.min(
      Math.max((now - segment.startTime) / segment.duration, 0),
      1
    );

    return {
      x: segment.fromTile.x + (segment.toTile.x - segment.fromTile.x) * t,
      y: segment.fromTile.y + (segment.toTile.y - segment.fromTile.y) * t
    };
  };
  const renderCell = (cell: CellType, x: number, y: number) => {
    const style: React.CSSProperties = {
      position: 'absolute',
      left: x * cellSize,
      top: y * cellSize,
      width: cellSize,
      height: cellSize,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: cellSize * 0.6,
      fontWeight: 'bold'
    };

    switch (cell) {
      case CellType.WALL:
        return (
          <div key={`${x}-${y}`} style={{
            ...style,
            backgroundColor: '#0000ff',
            border: '1px solid #4444ff'
          }} />
        );
      
      case CellType.PELLET:
        return (
          <div key={`${x}-${y}`} style={{
            ...style,
            color: '#ffff00'
          }}>
            •
          </div>
        );
      
      case CellType.POWER_PELLET:
        return (
          <div key={`${x}-${y}`} style={{
            ...style,
            color: '#ffff00',
            fontSize: cellSize * 0.8,
            animation: 'pulse 0.5s infinite alternate'
          }}>
            ●
          </div>
        );
      
      default:
        return <div key={`${x}-${y}`} style={style} />;
    }
  };

  const renderPacMan = () => {
    const { position, movementSegment, direction } = gameData.pacman;
    
    // Get interpolated visual position
    const visualPos = getInterpolatedPosition(movementSegment, position);
    
    // Calculate chomp animation - chomp while moving OR when direction is set (trying to move)
    const isMoving = (movementSegment !== null || direction !== Direction.NONE) && 
                     gameData.gameState === GameState.PLAYING;
    const chompProgress = getChompProgress(isMoving);
    
    // Check if Pac-Man is in disintegration state (just died)
    const isDisintegrating = gameData.gameState === GameState.DEATH_PAUSE;
    
    // Get mouth angle based on direction
    let mouthAngle = 0;
    switch (direction) {
      case Direction.UP:
        mouthAngle = -90; // Mouth opens upward
        break;
      case Direction.DOWN:
        mouthAngle = 90; // Mouth opens downward
        break;
      case Direction.LEFT:
        mouthAngle = 180; // Mouth opens to the left
        break;
      case Direction.RIGHT:
        mouthAngle = 0; // Mouth opens to the right
        break;
    }

    const pacmanSize = cellSize * 0.8;
    const pacmanRadius = pacmanSize / 2;
    const centerX = visualPos.x * cellSize + cellSize * 0.5;
    const centerY = visualPos.y * cellSize + cellSize * 0.5;

    if (isDisintegrating) {
      // Render disintegration animation
      return (
        <svg
          style={{
            position: 'absolute',
            left: centerX - pacmanRadius,
            top: centerY - pacmanRadius,
            width: pacmanSize,
            height: pacmanSize,
            zIndex: 10,
            pointerEvents: 'none'
          }}
        >
          <PacManDisintegration
            centerX={pacmanRadius}
            centerY={pacmanRadius}
            radius={pacmanRadius}
            progress={gameData.deathPauseTimer / 1500} // 1500ms death pause
          />
        </svg>
      );
    }

    return (
      <svg
        style={{
          position: 'absolute',
          left: centerX - pacmanRadius,
          top: centerY - pacmanRadius,
          width: pacmanSize,
          height: pacmanSize,
          zIndex: 10,
          pointerEvents: 'none'
        }}
      >
        <PacManMouth
          centerX={pacmanRadius}
          centerY={pacmanRadius}
          radius={pacmanRadius}
          mouthAngle={mouthAngle}
          chompProgress={chompProgress}
          isMoving={isMoving}
        />
      </svg>
    );
  };

  // Calculate chomp animation progress based on movement
  const getChompProgress = (isMoving: boolean): number => {
    if (!isMoving) {
      return 0; // Mouth closed when not moving
    }

    // Use continuous time-based animation for smooth looping
    const now = Date.now();
    const chompSpeed = 8; // Chomps per second
    const chompCycle = Math.sin((now / 1000) * chompSpeed * Math.PI * 2);
    
    // Convert to 0-1 range (0 = closed, 1 = fully open)
    return Math.max(0, chompCycle);
  };

  // Pac-Man death animation - classic arc collapse
  const PacManDisintegration: React.FC<{
    centerX: number;
    centerY: number;
    radius: number;
    progress: number; // 0 = just died, 1 = about to respawn
  }> = ({ centerX, centerY, radius, progress }) => {
    // Classic arcade death: Pac-Man collapses from top and bottom
    const animationProgress = 1 - progress; // Reverse so 1 = just died, 0 = about to respawn
    
    if (animationProgress <= 0) {
      return null; // Fully collapsed
    }
    
    // Calculate the visible height (collapses from top/bottom)
    const visibleHeight = radius * 2 * animationProgress;
    const clipTop = centerY - (visibleHeight / 2);
    
    // Create clipping mask for collapse effect
    const maskId = `death-mask-${Math.random().toString(36).substr(2, 9)}`;
    
    return (
      <g>
        <defs>
          <mask id={maskId}>
            <rect 
              x={centerX - radius} 
              y={clipTop} 
              width={radius * 2} 
              height={visibleHeight} 
              fill="white" 
            />
          </mask>
        </defs>
        
        {/* Pac-Man circle with vertical collapse */}
        <circle
          cx={centerX}
          cy={centerY}
          r={radius - 1}
          fill="#ffff00"
          stroke="#000000"
          strokeWidth="1"
          mask={`url(#${maskId})`}
          opacity={animationProgress}
        />
      </g>
    );
  };

  // Pac-Man mouth component using SVG with proper cutout
  const PacManMouth: React.FC<{
    centerX: number;
    centerY: number;
    radius: number;
    mouthAngle: number;
    chompProgress: number;
    isMoving: boolean;
  }> = ({ centerX, centerY, radius, mouthAngle, chompProgress, isMoving }) => {
    // Calculate mouth opening angle (0-80 degrees based on chomp progress)
    const maxMouthAngle = 80; // Maximum mouth opening in degrees (increased from 60)
    const currentMouthAngle = isMoving ? chompProgress * maxMouthAngle : 0;
    
    if (currentMouthAngle <= 0) {
      // Mouth closed - render full circle
      return (
        <circle
          cx={centerX}
          cy={centerY}
          r={radius - 1}
          fill="#ffff00"
          stroke="#000000"
          strokeWidth="1"
        />
      );
    }
    
    // Convert to radians
    const halfMouthRad = (currentMouthAngle / 2) * (Math.PI / 180);
    const mouthAngleRad = mouthAngle * (Math.PI / 180);
    
    // Calculate mouth wedge points for cutout
    const startAngle = mouthAngleRad - halfMouthRad;
    const endAngle = mouthAngleRad + halfMouthRad;
    
    const startX = centerX + radius * Math.cos(startAngle);
    const startY = centerY + radius * Math.sin(startAngle);
    const endX = centerX + radius * Math.cos(endAngle);
    const endY = centerY + radius * Math.sin(endAngle);
    
    // Create mask for mouth cutout
    const maskId = `pacman-mask-${Math.random().toString(36).substr(2, 9)}`;
    
    return (
      <g>
        <defs>
          <mask id={maskId}>
            {/* White circle - what will be visible */}
            <circle cx={centerX} cy={centerY} r={radius} fill="white" />
            {/* Black wedge - what will be cut out (mouth) */}
            <path
              d={`M ${centerX} ${centerY} L ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${endX} ${endY} Z`}
              fill="black"
            />
          </mask>
        </defs>
        
        {/* Full yellow circle with mouth cut out using mask */}
        <circle
          cx={centerX}
          cy={centerY}
          r={radius - 1}
          fill="#ffff00"
          stroke="#000000"
          strokeWidth="1"
          mask={`url(#${maskId})`}
        />
      </g>
    );
  };

  const getGhostLabel = (personality: string): string => {
    switch (personality) {
      case 'bully': return 'Bully';
      case 'loner': return 'Loner';
      case 'mimic': return 'Lost';
      case 'strategist': return 'Strategist';
      default: return '';
    }
  };

  const renderGhost = (ghost: any) => {
    // Get interpolated visual position
    const visualPos = getInterpolatedPosition(ghost.movementSegment, ghost.position);
    
    const ghostStyle: React.CSSProperties = {
      position: 'absolute',
      left: visualPos.x * cellSize + cellSize * 0.1,
      top: visualPos.y * cellSize + cellSize * 0.1,
      width: cellSize * 0.8,
      height: cellSize * 0.8,
      backgroundColor: ghost.isVulnerable ? '#0000ff' : ghost.color,
      borderRadius: '50% 50% 0 0',
      zIndex: 5,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      opacity: ghost.isEaten ? 0.3 : 1
    };

    // Add blinking effect when vulnerability is about to end
    if (ghost.isVulnerable && gameData.powerPelletTimer < 3000) {
      ghostStyle.animation = 'blink 0.2s infinite';
    }

    return (
      <div key={ghost.id}>
        {/* Ghost sprite */}
        <div style={ghostStyle}>
          {/* Ghost eyes */}
          <div style={{
            display: 'flex',
            gap: '2px',
            marginTop: '-20%'
          }}>
            <div style={{
              width: '4px',
              height: '4px',
              backgroundColor: '#ffffff',
              borderRadius: '50%'
            }} />
            <div style={{
              width: '4px',
              height: '4px',
              backgroundColor: '#ffffff',
              borderRadius: '50%'
            }} />
          </div>
        </div>
        
        {/* Ghost label */}
        <div style={{
          position: 'absolute',
          left: visualPos.x * cellSize,
          top: visualPos.y * cellSize - 12,
          width: cellSize,
          textAlign: 'center',
          fontSize: '8px',
          color: '#ffffff',
          fontFamily: 'monospace',
          fontWeight: 'bold',
          textShadow: '1px 1px 1px #000000',
          zIndex: 6,
          pointerEvents: 'none'
        }}>
          {getGhostLabel(ghost.personality)}
        </div>
      </div>
    );
  };

  const renderSpeechBubbles = () => {
    return gameData.speechBubbles.map((bubble, index) => {
      const ghost = gameData.ghosts.find(g => g.id === bubble.ghostId);
      if (!ghost) return null;

      const visualPos = getInterpolatedPosition(ghost.movementSegment, ghost.position);
      
      return (
        <div
          key={`${bubble.ghostId}-${index}`}
          style={{
            position: 'absolute',
            left: visualPos.x * cellSize - 10,
            top: visualPos.y * cellSize - 35,
            backgroundColor: '#ffffff',
            border: '2px solid #000000',
            borderRadius: '8px',
            padding: '4px 6px',
            fontSize: '10px',
            fontFamily: 'monospace',
            fontWeight: 'bold',
            color: '#000000',
            zIndex: 10,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            boxShadow: '2px 2px 4px rgba(0,0,0,0.3)'
          }}
        >
          {bubble.text}
          {/* Speech bubble tail */}
          <div style={{
            position: 'absolute',
            bottom: '-6px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '6px solid #ffffff'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '-4px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '4px solid transparent',
            borderRight: '4px solid transparent',
            borderTop: '4px solid #000000'
          }} />
        </div>
      );
    });
  };

  const renderGameStateOverlay = () => {
    if (gameData.gameState === GameState.WON) {
      return (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: '#ffff00',
          padding: '20px 40px',
          borderRadius: '10px',
          fontSize: '24px',
          fontFamily: 'monospace',
          fontWeight: 'bold',
          textAlign: 'center',
          zIndex: 100,
          border: '3px solid #ffff00'
        }}>
          YOU WIN!
          <div style={{
            fontSize: '40px',
            marginTop: '10px'
          }}>
            👑
          </div>
        </div>
      );
    }

    if (gameData.gameState === GameState.LOST) {
      return (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: '#ff0000',
          padding: '20px 40px',
          borderRadius: '10px',
          fontSize: '24px',
          fontFamily: 'monospace',
          fontWeight: 'bold',
          textAlign: 'center',
          zIndex: 100,
          border: '3px solid #ff0000'
        }}>
          GAME OVER
        </div>
      );
    }

    return null;
  };

  const mazeWidth = gameData.maze[0]?.length || 0;
  const mazeHeight = gameData.maze.length;

  return (
    <div style={{
      position: 'relative',
      width: mazeWidth * cellSize,
      height: mazeHeight * cellSize,
      backgroundColor: '#000000',
      border: '3px solid #0000ff',
      borderRadius: '8px',
      overflow: 'hidden'
    }}>
      {/* Render maze */}
      {gameData.maze.map((row, y) =>
        row.map((cell, x) => renderCell(cell, x, y))
      )}
      
      {/* Render Pac-Man */}
      {renderPacMan()}
      
      {/* Render ghosts */}
      {gameData.ghosts.map(ghost => renderGhost(ghost))}
      
      {/* Render speech bubbles */}
      {renderSpeechBubbles()}
      
      {/* Render game state overlays */}
      {renderGameStateOverlay()}
      
      {/* CSS animations */}
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          100% { opacity: 0.5; }
        }
        
        @keyframes blink {
          0% { opacity: 1; }
          50% { opacity: 0.3; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default PacManRenderer;