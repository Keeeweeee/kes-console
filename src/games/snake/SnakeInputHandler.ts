// Snake Input Handler - Clean keyboard input management

import { Direction } from './SnakeGame';

export type InputCallback = (direction: Direction) => void;

export class SnakeInputHandler {
  private callback: InputCallback | null = null;
  private isActive = false;

  constructor() {
    this.handleKeyPress = this.handleKeyPress.bind(this);
  }

  setCallback(callback: InputCallback): void {
    this.callback = callback;
  }

  activate(): void {
    if (!this.isActive) {
      this.isActive = true;
      document.addEventListener('keydown', this.handleKeyPress);
    }
  }

  deactivate(): void {
    if (this.isActive) {
      this.isActive = false;
      document.removeEventListener('keydown', this.handleKeyPress);
    }
  }

  private handleKeyPress(event: KeyboardEvent): void {
    if (!this.callback) return;

    let direction: Direction | null = null;

    switch (event.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        direction = Direction.UP;
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        direction = Direction.DOWN;
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        direction = Direction.LEFT;
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        direction = Direction.RIGHT;
        break;
    }

    if (direction) {
      event.preventDefault();
      this.callback(direction);
    }
  }

  destroy(): void {
    this.deactivate();
    this.callback = null;
  }
}