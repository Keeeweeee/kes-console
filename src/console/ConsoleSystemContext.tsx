// Console System State Management - Boot, Running, Shutdown

import React, { createContext, useContext, useState, ReactNode } from 'react';

export enum ConsoleSystemState {
  BOOT = 'BOOT',
  RUNNING = 'RUNNING',
  SHUTDOWN = 'SHUTDOWN'
}

interface ConsoleSystemContextType {
  systemState: ConsoleSystemState;
  powerOff: () => void;
  bootComplete: () => void;
}

const ConsoleSystemContext = createContext<ConsoleSystemContextType | null>(null);

export const useConsoleSystem = () => {
  const context = useContext(ConsoleSystemContext);
  if (!context) {
    throw new Error('useConsoleSystem must be used within a ConsoleSystemProvider');
  }
  return context;
};

interface ConsoleSystemProviderProps {
  children: ReactNode;
}

export const ConsoleSystemProvider: React.FC<ConsoleSystemProviderProps> = ({ children }) => {
  const [systemState, setSystemState] = useState<ConsoleSystemState>(ConsoleSystemState.BOOT);

  const powerOff = () => {
    setSystemState(ConsoleSystemState.SHUTDOWN);
  };

  const bootComplete = () => {
    setSystemState(ConsoleSystemState.RUNNING);
  };

  return (
    <ConsoleSystemContext.Provider value={{ systemState, powerOff, bootComplete }}>
      {children}
    </ConsoleSystemContext.Provider>
  );
};