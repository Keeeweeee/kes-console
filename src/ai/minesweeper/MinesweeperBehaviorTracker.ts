// Minesweeper Behavior Tracker - Tracks player trust and deception responses

import {
  MinesweeperMove,
  MinesweeperSession,
  MinesweeperBehaviorMetrics,
  TileAdvice
} from './MinesweeperBehaviorTypes';

export class MinesweeperBehaviorTracker {
  private currentSession: MinesweeperSession | null = null;
  private sessions: MinesweeperSession[] = [];
  private sessionCounter = 0;
  private lastAdviceGiven: TileAdvice | null = null;
  private lastMoveTime = 0;
  private consecutiveIgnoredAdvice = 0;

  startSession(): string {
    const sessionId = `minesweeper_${Date.now()}_${++this.sessionCounter}`;
    this.currentSession = {
      sessionId,
      startTime: Date.now(),
      moves: [],
      gameResult: 'abandoned',
      trustLevel: 0.5, // Start neutral
      deceptionCount: 0,
      adviceFollowedCount: 0,
      rageQuitDetected: false
    };
    return sessionId;
  }

  recordAdviceGiven(advice: TileAdvice): void {
    this.lastAdviceGiven = advice;
  }

  recordMove(
    row: number,
    col: number,
    action: 'click' | 'flag',
    result: 'safe' | 'mine' | 'flag_correct' | 'flag_incorrect'
  ): { followedAdvice: boolean; ignoredAdvice: boolean } {
    if (!this.currentSession) return { followedAdvice: false, ignoredAdvice: false };

    const now = Date.now();
    const followedAdvice = this.checkIfFollowedAdvice(row, col, action);
    const ignoredAdvice = this.lastAdviceGiven !== null && !followedAdvice;

    const move: MinesweeperMove = {
      timestamp: now,
      row,
      col,
      action,
      followedAIAdvice: followedAdvice,
      aiAdviceGiven: this.lastAdviceGiven ? { ...this.lastAdviceGiven } : undefined,
      result
    };

    this.currentSession.moves.push(move);

    // Track consecutive ignored advice
    if (ignoredAdvice) {
      this.consecutiveIgnoredAdvice++;
    } else if (followedAdvice) {
      this.consecutiveIgnoredAdvice = 0;
    }

    // Record loss context when mine is hit
    if (result === 'mine') {
      if (followedAdvice) {
        this.currentSession.lossContext = 'advice_followed';
      } else if (ignoredAdvice) {
        this.currentSession.lossContext = 'advice_ignored';
      } else {
        this.currentSession.lossContext = 'no_advice';
      }
    }

    // Update trust level based on advice outcome
    if (followedAdvice && this.lastAdviceGiven) {
      if (this.lastAdviceGiven.isDeceptive) {
        // Player followed deceptive advice
        this.currentSession.deceptionCount++;
        if (result === 'mine') {
          // Deception succeeded - player hit mine
          this.currentSession.trustLevel = Math.max(0, this.currentSession.trustLevel - 0.3);
        }
      } else {
        // Player followed honest advice
        this.currentSession.adviceFollowedCount++;
        if (result === 'safe') {
          // Honest advice was correct
          this.currentSession.trustLevel = Math.min(1, this.currentSession.trustLevel + 0.1);
        }
      }
    }

    // Detect rage quit (quick succession of moves after hitting mine)
    if (result === 'mine' && this.lastMoveTime > 0) {
      const timeSinceLastMove = now - this.lastMoveTime;
      if (timeSinceLastMove < 1000) { // Less than 1 second
        this.currentSession.rageQuitDetected = true;
      }
    }

    this.lastMoveTime = now;
    
    // Clear advice AFTER evaluation
    this.lastAdviceGiven = null;

    return { followedAdvice, ignoredAdvice };
  }

  private checkIfFollowedAdvice(row: number, col: number, action: 'click' | 'flag'): boolean {
    if (!this.lastAdviceGiven) return false;
    
    // Must match exact coordinates
    const samePosition = this.lastAdviceGiven.row === row && this.lastAdviceGiven.col === col;
    
    if (!samePosition) return false;

    // Check if action matches advice
    if (action === 'click' && this.lastAdviceGiven.aiSuggestion === 'safe') return true;
    if (action === 'flag' && this.lastAdviceGiven.aiSuggestion === 'dangerous') return true;
    
    return false;
  }

  getConsecutiveIgnoredAdvice(): number {
    return this.consecutiveIgnoredAdvice;
  }

  getLastAdvice(): TileAdvice | null {
    return this.lastAdviceGiven;
  }

  endSession(gameResult: 'won' | 'lost' | 'abandoned'): void {
    if (!this.currentSession) return;

    this.currentSession.endTime = Date.now();
    this.currentSession.gameResult = gameResult;

    // Detect rage quit based on game result and session duration
    const sessionDuration = this.currentSession.endTime - this.currentSession.startTime;
    if (gameResult === 'abandoned' && sessionDuration < 30000) { // Less than 30 seconds
      this.currentSession.rageQuitDetected = true;
    }

    this.sessions.push(this.currentSession);
    
    // Keep only last 10 sessions
    if (this.sessions.length > 10) {
      this.sessions = this.sessions.slice(-10);
    }

    this.currentSession = null;
    this.lastAdviceGiven = null;
  }

  calculateMetrics(): MinesweeperBehaviorMetrics {
    if (this.sessions.length === 0) {
      return {
        totalSessions: 0,
        averageTrustLevel: 0.5,
        deceptionSuccessRate: 0,
        adviceFollowRate: 0,
        rageQuitFrequency: 0,
        averageSessionDuration: 0,
        winRate: 0,
        totalDeceptions: 0,
        totalAdviceGiven: 0
      };
    }

    const totalSessions = this.sessions.length;
    const totalTrustLevel = this.sessions.reduce((sum, s) => sum + s.trustLevel, 0);
    const totalDeceptions = this.sessions.reduce((sum, s) => sum + s.deceptionCount, 0);
    const totalAdviceFollowed = this.sessions.reduce((sum, s) => sum + s.adviceFollowedCount, 0);
    const totalMoves = this.sessions.reduce((sum, s) => sum + s.moves.length, 0);
    const rageQuits = this.sessions.filter(s => s.rageQuitDetected).length;
    const wins = this.sessions.filter(s => s.gameResult === 'won').length;
    
    const totalDuration = this.sessions.reduce((sum, s) => {
      return sum + ((s.endTime || s.startTime) - s.startTime);
    }, 0);

    // Calculate deception success rate
    const successfulDeceptions = this.sessions.reduce((sum, s) => {
      return sum + s.moves.filter(m => 
        m.followedAIAdvice && 
        m.aiAdviceGiven?.isDeceptive && 
        m.result === 'mine'
      ).length;
    }, 0);

    return {
      totalSessions,
      averageTrustLevel: totalTrustLevel / totalSessions,
      deceptionSuccessRate: totalDeceptions > 0 ? successfulDeceptions / totalDeceptions : 0,
      adviceFollowRate: totalMoves > 0 ? totalAdviceFollowed / totalMoves : 0,
      rageQuitFrequency: rageQuits / totalSessions,
      averageSessionDuration: totalDuration / totalSessions,
      winRate: wins / totalSessions,
      totalDeceptions,
      totalAdviceGiven: totalAdviceFollowed + totalDeceptions
    };
  }

  getCurrentTrustLevel(): number {
    return this.currentSession?.trustLevel || 0.5;
  }

  getDeceptionCount(): number {
    return this.currentSession?.deceptionCount || 0;
  }

  getSessionCount(): number {
    return this.sessions.length;
  }

  hasRageQuit(): boolean {
    return this.currentSession?.rageQuitDetected || false;
  }

  getLossContext(): 'advice_followed' | 'advice_ignored' | 'no_advice' | null {
    return this.currentSession?.lossContext || null;
  }
}