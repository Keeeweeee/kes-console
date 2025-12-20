import React from 'react';
import './KAI.css';

interface KAIProps {
  commentary?: string;
  isVisible?: boolean;
  className?: string;
}

const KAI: React.FC<KAIProps> = ({ 
  commentary, 
  isVisible = true,
  className = ''
}) => {
  if (!isVisible) return null;

  return (
    <div className={`kai-root ${className}`}>
      <div className="kai-anchor">
        {commentary && (
          <div className="kai-speech">
            <div className="kai-speech-content">
              {commentary}
              <span className="kai-cursor">█</span>
            </div>
            <div className="kai-speech-tail" />
          </div>
        )}

        <div className="kai-avatar">
          <img
            src="/avatars/kai.png"
            alt="KAI"
            className="kai-sprite"
            draggable={false}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const placeholder = target.nextElementSibling as HTMLElement;
              if (placeholder) placeholder.style.display = 'flex';
            }}
          />
          <div className="kai-placeholder" style={{ display: 'none' }}>🤖</div>
          <div className="kai-name">KAI</div>
        </div>
      </div>
    </div>
  );
};

export default KAI;