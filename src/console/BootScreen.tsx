// KES Boot Screen Component

import { useEffect, useState } from 'react';
import { TypedText } from './TypedText';
import './BootScreen.css';

interface BootScreenProps {
  onBootComplete: () => void;
}

const BootScreen: React.FC<BootScreenProps> = ({ onBootComplete }) => {
  const [currentLine, setCurrentLine] = useState(0);
  const [showCursor, setShowCursor] = useState(true);

  const bootLines = [
    'KAI ENTERTAINMENT SYSTEM v1.0',
    'KES BOOTING…'
  ];

  // Blinking cursor effect
  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 500);

    return () => clearInterval(cursorInterval);
  }, []);

  // Auto-advance lines and complete boot
  useEffect(() => {
    if (currentLine < bootLines.length) {
      const timer = setTimeout(() => {
        setCurrentLine(prev => prev + 1);
      }, 800); // 800ms per line

      return () => clearTimeout(timer);
    } else {
      // All lines shown, complete boot after a brief pause
      const completeTimer = setTimeout(() => {
        onBootComplete();
      }, 1000);

      return () => clearTimeout(completeTimer);
    }
  }, [currentLine, bootLines.length, onBootComplete]);

  return (
    <div className="boot-screen">
      <div className="boot-content">
        {bootLines.slice(0, currentLine + 1).map((line, index) => (
          <div key={index} className="boot-line">
            {index === currentLine ? (
              <TypedText text={line} speed={50} />
            ) : (
              line
            )}
          </div>
        ))}
        {currentLine >= 2 && (
          <div className="boot-copyright">© 2025</div>
        )}
        {currentLine < bootLines.length && showCursor && (
          <span className="boot-cursor">_</span>
        )}
      </div>
      <div className="boot-designer">Designed by Keeeweeee🥝</div>
    </div>
  );
};

export default BootScreen;