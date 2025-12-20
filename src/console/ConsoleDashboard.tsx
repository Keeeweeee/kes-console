import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useConsoleAI } from '../ai/console/ConsoleAIContext'
import { useConsoleSystem } from './ConsoleSystemContext'
import { ConsoleAIState } from '../ai/console/ConsoleAIAnalyzer'
import './ConsoleDashboard.css'
import { TypedText } from "./TypedText";
import { useAudio } from '../audio/useAudio';

interface GameInfo {
  sessionsPlayed: number
  lastPlayed: string
  consecutiveStreak: number
  bestScore: number | null
  behavioralInsight: string
}

// Console UI - NES-style horizontal banner carousel
const ConsoleDashboard = () => {
  const navigate = useNavigate()
  const { consoleAI } = useConsoleAI()
  const { powerOff } = useConsoleSystem()
  const [selectedGameIndex, setSelectedGameIndex] = useState(0)
  const [loadingMessage, setLoadingMessage] = useState<string>('')
  const [aiState, setAIState] = useState<ConsoleAIState | null>(null)
  const [gameInfo, setGameInfo] = useState<GameInfo | null>(null)
  const [arrowPosition, setArrowPosition] = useState<number>(0)
  const carouselRef = useRef<HTMLDivElement>(null)
  const { playMusic, stopMusic } = useAudio()

  // Initialize console AI on component mount
  useEffect(() => {
    let mounted = true

    const initAI = async () => {
      if (!consoleAI) return

      const initialState = await consoleAI.onAppLoad()

      if (mounted) {
        setAIState(initialState)
      }

      // Optional debug
      if ('debugGlobalData' in consoleAI) {
        (consoleAI as any).debugGlobalData()
      }
    }

    initAI()

    return () => {
      mounted = false
      if (consoleAI) {
        consoleAI.onSessionEnd()
      }
    }
  }, [consoleAI])


  // Audio lifecycle management
  useEffect(() => {
    // Start dashboard music when component mounts
    playMusic('dashboard');

    // Cleanup: stop music when component unmounts (navigating away)
    return () => {
      stopMusic();
    };
  }, []);


  const games = [
    { 
      id: 'snake', 
      name: 'Snake', 
      subtitle: 'Goal: Score 500 (Impossible)',
      description: 'The rules are familiar.\nThe board is not.\nSomething is learning how you move — and it gets bored easily.\nGoal: Reach a score of 500. Impossible? Possibly',
      bannerImage: '/banners/snake.png', // Placeholder - replace with uploaded image
      playerCount: 1
    },
    { 
      id: 'minesweeper', 
      name: 'Minesweeper', 
      subtitle: 'Find the mines\nTrust no one',
      description: 'The numbers never lie.\nBut they don’t tell the whole truth either.\nTread carefully...',
      bannerImage: '/banners/minesweeper.png', // Placeholder - replace with uploaded image
      playerCount: 1
    },
    { 
      id: 'pacman', 
      name: 'Pac-Man', 
      subtitle: 'But with a twist',
      description: 'You’ve memorized the maze.\nThey’ve memorized you.\nRunning won’t feel the same this time.',
      bannerImage: '/banners/pacman.png', // Placeholder - replace with uploaded image
      playerCount: 1
    },
    { 
      id: 'blockbreaker', 
      name: 'Block Breaker', 
      subtitle: 'Chaotic version',
      description: 'Break the pattern.\nThe pattern breaks back.\nNot all blocks are meant to disappear.',
      bannerImage: '/banners/block-breaker.png', // Placeholder - replace with uploaded image
      playerCount: 1
    }
  ]

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (loadingMessage) return // Disable navigation during loading

      switch (e.code) {
        case 'ArrowLeft':
          e.preventDefault()
          setSelectedGameIndex(prev => prev > 0 ? prev - 1 : games.length - 1)
          break
        case 'ArrowRight':
          e.preventDefault()
          setSelectedGameIndex(prev => prev < games.length - 1 ? prev + 1 : 0)
          break
        case 'Enter':
        case 'Space':
          e.preventDefault()
          handleGameSelect()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedGameIndex, loadingMessage, games.length])

  // Auto-scroll carousel to center selected game and update arrow position
  useEffect(() => {
    if (carouselRef.current) {
      const bannerWidth = 260 // Banner width + gap (240 + 20)
      const scrollPosition = selectedGameIndex * bannerWidth - (carouselRef.current.offsetWidth / 2) + (bannerWidth / 2)
      carouselRef.current.scrollTo({
        left: scrollPosition,
        behavior: 'smooth'
      })
    }
    
    // Update arrow position after scroll animation
    const updateArrowPosition = () => {
      if (carouselRef.current) {
        const selectedBanner = carouselRef.current.querySelector('.game-banner.selected') as HTMLElement
        if (selectedBanner) {
          const bannerRect = selectedBanner.getBoundingClientRect()
          
          // Calculate the center of the selected banner relative to the viewport
          const bannerCenter = bannerRect.left + bannerRect.width / 2
          
          // Set arrow position relative to the viewport
          setArrowPosition(bannerCenter)
        }
      }
    }
    
    // Update immediately and after scroll animation completes
    updateArrowPosition()
    const timeoutId = setTimeout(updateArrowPosition, 300) // Match scroll animation duration
    
    return () => clearTimeout(timeoutId)
  }, [selectedGameIndex])

  // Update game info and trigger preview commentary when selection changes
  useEffect(() => {
    if (consoleAI && games[selectedGameIndex]) {
      const selectedGame = games[selectedGameIndex]
      const gameId = selectedGame.id
      
      // Trigger preview commentary (READ-ONLY, no memory mutation)
      const newAIState = consoleAI.onGamePreview(gameId)
      setAIState(newAIState)
    }
  }, [selectedGameIndex, consoleAI])

  // Update game info whenever AI state changes (including after launches)
  useEffect(() => {
    if (consoleAI && games[selectedGameIndex]) {
      const selectedGame = games[selectedGameIndex]
      const gameId = selectedGame.id
      
      // Get fresh data from console AI
      const sessionsPlayed = consoleAI.getGameLaunchCount(gameId)
      const consecutiveStreak = consoleAI.getConsecutiveReplays(gameId)
      const lastPlayed = consoleAI.formatLastPlayed(gameId)
      const bestScore = consoleAI.getBestScore(gameId)
      const behavioralInsight = consoleAI.getBehavioralInsight(gameId)
      
      setGameInfo({
        sessionsPlayed,
        lastPlayed,
        consecutiveStreak,
        bestScore,
        behavioralInsight
      })
    }
  }, [selectedGameIndex, consoleAI, aiState])

  const handleGameSelect = () => {
    const selectedGame = games[selectedGameIndex]
    setLoadingMessage(`Loading ${selectedGame.name}...`)
    
    // Record game launch (actual start) with AI
    if (consoleAI) {
      console.log(`🚀 LAUNCHING GAME: ${selectedGame.id}`)
      const newAIState = consoleAI.onGameLaunch(selectedGame.id)
      setAIState(newAIState)
      console.log(`📊 NEW LAUNCH COUNT: ${consoleAI.getGameLaunchCount(selectedGame.id)}`)
    }
    
    // Simulate loading delay then navigate
    setTimeout(() => {
      setLoadingMessage('')
      navigate(`/game/${selectedGame.id}`)
    }, 1500)
  }

  const handleBannerClick = (index: number) => {
    if (index === selectedGameIndex) {
      handleGameSelect()
    } else {
      setSelectedGameIndex(index)
    }
  }
  // Add scroll and resize event listeners to update arrow position
  useEffect(() => {
    const updateArrowPosition = () => {
      if (carouselRef.current) {
        const selectedBanner = carouselRef.current.querySelector('.game-banner.selected') as HTMLElement
        if (selectedBanner) {
          const bannerRect = selectedBanner.getBoundingClientRect()
          const bannerCenter = bannerRect.left + bannerRect.width / 2
          setArrowPosition(bannerCenter)
        }
      }
    }

    const handleScroll = () => {
      updateArrowPosition()
    }

    const handleResize = () => {
      updateArrowPosition()
    }

    const carousel = carouselRef.current
    if (carousel) {
      carousel.addEventListener('scroll', handleScroll)
    }
    
    window.addEventListener('resize', handleResize)
    
    return () => {
      if (carousel) {
        carousel.removeEventListener('scroll', handleScroll)
      }
      window.removeEventListener('resize', handleResize)
    }
  }, [selectedGameIndex])
  return (
    <div className="nes-console">
      {/* Top Console Bar */}
      <div className="console-top-bar">
        <div className="console-icons">
          <div className="console-icon">⚙</div>
          <div className="console-icon">🎮</div>
          <div className="console-icon">🤖</div>
          <div className="console-icon">❓</div>
        </div>
        <div className="console-title">KES CONSOLE</div>
        <div className="power-section">
          <button 
            className="power-button" 
            onClick={powerOff}
            title="Power Off"
          >
            ⏻
          </button>
          <div className="power-indicator">
            <div className="power-light"></div>
          </div>
        </div>
      </div>

      {/* Main Game Carousel */}
      <div className="game-carousel-container">
        <div className="game-carousel" ref={carouselRef}>
          {games.map((game, index) => (
            <div 
              key={game.id}
              className={`game-banner ${index === selectedGameIndex ? 'selected' : ''}`}
              onClick={() => handleBannerClick(index)}
            >
              <div className="banner-image">
                <img 
                  src={game.bannerImage} 
                  alt={game.name}
                  className="banner-img"
                  onError={(e) => {
                    // Fallback to placeholder if image fails to load
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const placeholder = target.nextElementSibling as HTMLElement;
                    if (placeholder) placeholder.style.display = 'flex';
                  }}
                />
                <div className="banner-placeholder" style={{
                  display: 'none',
                  background: index === 0 ? 'linear-gradient(45deg, #2d5a27, #4a7c59)' : // Snake green
                             index === 1 ? 'linear-gradient(45deg, #666, #999)' : // Minesweeper gray
                             index === 2 ? 'linear-gradient(45deg, #1a1a2e, #16213e)' : // Pac-Man blue
                             'linear-gradient(45deg, #2c1810, #5d4037)' // Block Breaker brown
                }}>
                  {/* Game-specific visual elements */}
                  {index === 0 && <div className="snake-visual">🐍</div>}
                  {index === 1 && <div className="mine-visual">💣</div>}
                  {index === 2 && <div className="pacman-visual">👻</div>}
                  {index === 3 && <div className="blocks-visual">🧱</div>}
                </div>
              </div>
              <div className="banner-overlay">
                <div className="game-title">{game.name}</div>
                <div className="game-subtitle">{game.subtitle}</div>
                <div className="player-count">{game.playerCount}P</div>
              </div>
              {index === selectedGameIndex && (
                <div className="selection-glow"></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Game Info Panel - NES Classic Style */}
      {gameInfo && !loadingMessage && (
        <div
          className="game-info-panel"
          style={{
            ['--arrow-x' as any]: `${arrowPosition}px`
          }}
        >
          <div className="game-info-header">
            <div className="info-icon">📊</div>
            <div className="info-title">{games[selectedGameIndex]?.name || 'Game'} Information</div>
          </div>
          <div className="game-info-content horizontal">
            <div className="game-description">
              {games[selectedGameIndex]?.description || "No description available."}
            </div>
            <div className="info-row">
              <span className="info-label">Sessions Played</span>
              <span className={`info-value ${gameInfo.sessionsPlayed >= 10 ? 'highlight' : ''}`}>
                {gameInfo.sessionsPlayed}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">Last Played</span>
              <span className={`info-value ${gameInfo.lastPlayed === 'Today' ? 'highlight' : ''}`}>
                {gameInfo.lastPlayed}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">Consecutive Streak</span>
              <span className={`info-value ${gameInfo.consecutiveStreak >= 3 ? 'highlight' : ''}`}>
                {gameInfo.consecutiveStreak}
              </span>
            </div>
            {gameInfo.bestScore !== null && (
              <div className="info-row">
                <span className="info-label">Best Score</span>
                <span className={`info-value ${gameInfo.bestScore >= 100 ? 'highlight' : ''}`}>
                  {gameInfo.bestScore}
                </span>
              </div>
            )}
            <div className="info-insight">
              <TypedText text={gameInfo.behavioralInsight} speed={25} />
            </div>
          </div>
        </div>
      )}

      {/* KAI Avatar and Commentary */}
      <div className="kai-section">
        <div className="kai-anchor">

          {/* Kai Sprite */}
          <div className="kai-avatar">
            <div className="kai-sprite">
              <img
                src="/avatars/kai.png"
                alt="KAI"
                className="kai-img"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const placeholder = target.nextElementSibling as HTMLElement;
                  if (placeholder) placeholder.style.display = 'flex';
                }}
              />
              <div className="kai-placeholder" style={{ display: 'none' }}>🤖</div>
            </div>

            <div className="kai-name">KAI</div>
          </div>

          {/* Speech Bubble (anchored to Kai) */}
          {(aiState?.commentary || loadingMessage) && (
            <div className="kai-speech-bubble">
              <div className="speech-content">
                <TypedText
                  text={loadingMessage || aiState?.commentary || "► AI SYSTEM INITIALIZING..."}
                  speed={30}
                />
              </div>
              <div className="speech-tail"></div>
            </div>
          )}

        </div>
      </div>


      {/* Bottom Console Bar */}
      <div className="console-bottom-bar">
        <div className="control-hints">
          <span>◀▶ SELECT</span>
          <span>ENTER START</span>
          <span>SPACE CONFIRM</span>
        </div>
        <div className="status-info">
          <span>GAMES: {games.length}</span>
          <span>AI: {aiState ? 'ONLINE' : 'LOADING'}</span>
        </div>
      </div>

      {/* Loading Overlay */}
      {loadingMessage && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="loading-spinner">●●●</div>
            <div className="loading-text">{loadingMessage}</div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ConsoleDashboard