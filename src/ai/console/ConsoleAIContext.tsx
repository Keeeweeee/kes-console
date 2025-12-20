// Console AI Context - Provides global access to console AI

import React, { createContext, useContext, useRef, ReactNode } from 'react';
import { ConsoleAIAnalyzer } from './ConsoleAIAnalyzer';

interface ConsoleAIContextType {
  consoleAI: ConsoleAIAnalyzer | null;
}

const ConsoleAIContext = createContext<ConsoleAIContextType>({ consoleAI: null });

export const useConsoleAI = () => {
  const context = useContext(ConsoleAIContext);
  if (!context) {
    throw new Error('useConsoleAI must be used within a ConsoleAIProvider');
  }
  return context;
};

interface ConsoleAIProviderProps {
  children: ReactNode;
}

export const ConsoleAIProvider: React.FC<ConsoleAIProviderProps> = ({ children }) => {
  const consoleAIRef = useRef<ConsoleAIAnalyzer | null>(null);

  // Initialize console AI if not already done
  if (!consoleAIRef.current) {
    consoleAIRef.current = new ConsoleAIAnalyzer();
  }

  return (
    <ConsoleAIContext.Provider value={{ consoleAI: consoleAIRef.current }}>
      {children}
    </ConsoleAIContext.Provider>
  );
};