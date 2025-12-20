// KES Shutdown Screen Component

import { useEffect, useState, useRef } from 'react';
import { TypedText } from './TypedText';
import { useAudio } from '../audio/useAudio';
import './ShutdownScreen.css';

const ShutdownScreen: React.FC = () => {
  const [currentLine, setCurrentLine] = useState(0);
  const [showFinalMessage, setShowFinalMessage] = useState(false);
  const { playSFX } = useAudio();
  const hasPlayedSound = useRef(false);

  const shutdownLines = [
    'KAI ENTERTAINMENT SYSTEM',
    'POWERING DOWN…'
  ];

  const kaiComments = [
    "Finally. Silence.",
    "Powering off won't fix that score.",
    "Session terminated. Dignity not found.",
    "Powering off. Ragequit detected.",
    "System shutdown. Skills not saved.",
    "Goodbye. Try harder next time."
  ];

  // Play game-over sound when shutdown starts (only once)
  useEffect(() => {
    if (!hasPlayedSound.current) {
      playSFX('gameOver', 'snake');
      hasPlayedSound.current = true;
    }
  }, []); // Empty dependency array to run only once

  // Auto-advance lines
  useEffect(() => {
    if (currentLine < shutdownLines.length) {
      const timer = setTimeout(() => {
        setCurrentLine(prev => prev + 1);
      }, 1000); // 1 second per line

      return () => clearTimeout(timer);
    } else {
      // Show KAI's final comment after shutdown lines
      const finalTimer = setTimeout(() => {
        setShowFinalMessage(true);
      }, 1500);

      return () => clearTimeout(finalTimer);
    }
  }, [currentLine, shutdownLines.length]);

  const randomKaiComment = kaiComments[Math.floor(Math.random() * kaiComments.length)];

  return (
    <div className="shutdown-screen">
      <div className="shutdown-content">
        {shutdownLines.slice(0, currentLine + 1).map((line, index) => (
          <div key={index} className="shutdown-line">
            {index === currentLine ? (
              <TypedText text={line} speed={60} />
            ) : (
              line
            )}
          </div>
        ))}
        
        {currentLine >= 2 && (
          <div className="shutdown-copyright">© 2025</div>
        )}
        
        {showFinalMessage && (
          <div className="kai-final-comment">
            <TypedText text={randomKaiComment} speed={40} />
          </div>
        )}
      </div>
      
      <div className="shutdown-designer">Designed by Keeeweeee🥝</div>
      
      {currentLine >= shutdownLines.length && (
        <div className="system-off-indicator">
          SYSTEM OFF
        </div>
      )}
    </div>
  );
};

export default ShutdownScreen;