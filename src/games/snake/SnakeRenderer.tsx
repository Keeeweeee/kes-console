import React, { useRef, useEffect, useState } from 'react';
import { SnakeGameData, Position } from './SnakeGame';

interface SnakeRendererProps {
  gameData: SnakeGameData;
  cellSize?: number;
  shouldShowFakeFood?: () => boolean;
}

const SnakeRenderer: React.FC<SnakeRendererProps> = ({ 
  gameData, 
  cellSize = 20,
  shouldShowFakeFood
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [animationFrame, setAnimationFrame] = useState(0);

  // Animation loop for corruption effects
  useEffect(() => {
    const animate = () => {
      setAnimationFrame(prev => prev + 1);
      requestAnimationFrame(animate);
    };
    const animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // CORRUPTION EFFECTS
    const { colorShift, gridTension, foodPulseRate } = gameData.environmentalEffects;
    
    // Apply grid tension (shake)
    if (gridTension) {
      const shakeX = (Math.random() - 0.5) * 2;
      const shakeY = (Math.random() - 0.5) * 2;
      ctx.translate(shakeX, shakeY);
    }

    // Clear canvas with color shift
    const baseColor = 13 + Math.floor(colorShift * 20); // Shift from #0d1117
    ctx.fillStyle = `rgb(${baseColor}, ${Math.floor(baseColor * 1.2)}, ${Math.floor(baseColor * 1.3)})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid (subtle, with corruption tint)
    const gridColor = 33 + Math.floor(colorShift * 30);
    ctx.strokeStyle = `rgb(${gridColor}, ${Math.floor(gridColor * 1.1)}, ${Math.floor(gridColor * 1.2)})`;
    ctx.lineWidth = 1;
    for (let x = 0; x <= gameData.gridWidth; x++) {
      ctx.beginPath();
      ctx.moveTo(x * cellSize, 0);
      ctx.lineTo(x * cellSize, gameData.gridHeight * cellSize);
      ctx.stroke();
    }
    for (let y = 0; y <= gameData.gridHeight; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * cellSize);
      ctx.lineTo(gameData.gridWidth * cellSize, y * cellSize);
      ctx.stroke();
    }

    // Draw environmental blocks (solid obstacles)
    gameData.environmentalBlocks.forEach((block) => {
      ctx.fillStyle = '#8b0000'; // Dark red
      ctx.fillRect(
        block.x * cellSize,
        block.y * cellSize,
        cellSize,
        cellSize
      );
      
      // Add border to make blocks more visible
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        block.x * cellSize + 1,
        block.y * cellSize + 1,
        cellSize - 2,
        cellSize - 2
      );
    });

    // Draw snake (with corruption tint)
    gameData.snake.forEach((segment, index) => {
      const isHead = index === 0;
      const greenShift = Math.floor(colorShift * 50);
      ctx.fillStyle = isHead 
        ? `rgb(${76 + greenShift}, ${175 - greenShift}, ${80 + greenShift})` 
        : `rgb(${46 + greenShift}, ${125 - greenShift}, ${50 + greenShift})`;
      ctx.fillRect(
        segment.x * cellSize + 1,
        segment.y * cellSize + 1,
        cellSize - 2,
        cellSize - 2
      );

      // Add eyes to head
      if (isHead) {
        ctx.fillStyle = '#ffffff';
        const eyeSize = 3;
        const eyeOffset = 5;
        ctx.fillRect(
          segment.x * cellSize + eyeOffset,
          segment.y * cellSize + eyeOffset,
          eyeSize,
          eyeSize
        );
        ctx.fillRect(
          segment.x * cellSize + cellSize - eyeOffset - eyeSize,
          segment.y * cellSize + eyeOffset,
          eyeSize,
          eyeSize
        );
        
        // Draw crown if player has won
        if (gameData.hasWon) {
          ctx.fillStyle = '#ffd700'; // Gold
          ctx.font = `${cellSize}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(
            '👑',
            segment.x * cellSize + cellSize / 2,
            segment.y * cellSize - cellSize / 2
          );
        }
      }
    });

    // Draw real food (with pulse effect)
    const pulseIntensity = Math.sin(animationFrame * 0.1 * foodPulseRate) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(255, 107, 107, ${pulseIntensity})`;
    ctx.fillRect(
      gameData.food.x * cellSize + 2,
      gameData.food.y * cellSize + 2,
      cellSize - 4,
      cellSize - 4
    );

    // Add food highlight
    ctx.fillStyle = `rgba(255, 153, 153, ${pulseIntensity * 0.8})`;
    ctx.fillRect(
      gameData.food.x * cellSize + 4,
      gameData.food.y * cellSize + 4,
      cellSize - 8,
      cellSize - 8
    );

    // Draw fake foods (with distinct jitter/flicker effect)
    gameData.fakeFoods.forEach((fakeFood, index) => {
      if (!shouldShowFakeFood || shouldShowFakeFood()) {
        // Fake food jitters and flickers differently than real food
        const jitterX = Math.sin(animationFrame * 0.4 + index) * 1.5;
        const jitterY = Math.cos(animationFrame * 0.4 + index) * 1.5;
        const flickerIntensity = Math.abs(Math.sin(animationFrame * 0.5 + index)) * 0.6 + 0.4;
        
        // Fake food is more orange/yellow tinted and jittery
        ctx.fillStyle = `rgba(255, 140, 0, ${flickerIntensity})`;
        ctx.fillRect(
          fakeFood.x * cellSize + 2 + jitterX,
          fakeFood.y * cellSize + 2 + jitterY,
          cellSize - 4,
          cellSize - 4
        );

        // Fake food has erratic highlight pattern
        ctx.fillStyle = `rgba(255, 200, 100, ${flickerIntensity * 0.3})`;
        ctx.fillRect(
          fakeFood.x * cellSize + 4 + jitterX,
          fakeFood.y * cellSize + 4 + jitterY,
          cellSize - 8,
          cellSize - 8
        );
      }
    });

    // Reset transformation
    if (gridTension) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

  }, [gameData, cellSize, animationFrame, shouldShowFakeFood]);

  return (
    <canvas
      ref={canvasRef}
      width={gameData.gridWidth * cellSize}
      height={gameData.gridHeight * cellSize}
      style={{
        border: '2px solid #34495e',
        borderRadius: '4px',
        background: '#0d1117'
      }}
    />
  );
};

export default SnakeRenderer;