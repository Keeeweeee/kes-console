import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import { ConsoleAIProvider } from './ai/console/ConsoleAIContext'
import { ConsoleSystemProvider, useConsoleSystem, ConsoleSystemState } from './console/ConsoleSystemContext'
import ConsoleDashboard from './console/ConsoleDashboard'
import GameContainer from './games/GameContainer'
import BootScreen from './console/BootScreen'
import ShutdownScreen from './console/ShutdownScreen'

function AppContent() {
  const { systemState, bootComplete } = useConsoleSystem();

  // Show boot screen first
  if (systemState === ConsoleSystemState.BOOT) {
    return <BootScreen onBootComplete={bootComplete} />;
  }

  // Show shutdown screen
  if (systemState === ConsoleSystemState.SHUTDOWN) {
    return <ShutdownScreen />;
  }

  // Normal app operation
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<ConsoleDashboard />} />
          <Route path="/game/:gameType" element={<GameContainer />} />
        </Routes>
      </div>
    </Router>
  );
}

function App() {
  return (
    <ConsoleSystemProvider>
      <ConsoleAIProvider>
        <AppContent />
      </ConsoleAIProvider>
    </ConsoleSystemProvider>
  )
}

export default App