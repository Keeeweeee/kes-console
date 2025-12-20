// Core Game Engine - Base classes and interfaces for all games

export interface GameState {
  isRunning: boolean
  isPaused: boolean
  score: number
  startTime: Date
  endTime?: Date
}

export interface GameConfig {
  width: number
  height: number
  fps: number
}

export abstract class BaseGame {
  protected state: GameState
  protected config: GameConfig

  constructor(config: GameConfig) {
    this.config = config
    this.state = {
      isRunning: false,
      isPaused: false,
      score: 0,
      startTime: new Date()
    }
  }

  abstract start(): void
  abstract pause(): void
  abstract resume(): void
  abstract stop(): void
  abstract update(deltaTime: number): void
  abstract render(context: CanvasRenderingContext2D): void

  getState(): GameState {
    return { ...this.state }
  }
}