// Pac-Man AI Types - Ghost personality and behavior analysis

import { Position, Direction, Ghost } from '../../games/pacman/PacManGame';

export interface GhostPersonalityState {
  ghostId: string;
  personality: 'loner' | 'bully' | 'mimic' | 'strategist';
  currentBehavior: string;
  targetPosition: Position | null;
  aggressionLevel: number; // 0-1
  fearLevel: number; // 0-1 (when vulnerable)
  lastDecision: string;
}

export interface PacManBehaviorMetrics {
  totalMoves: number;
  aggressiveMovesTowardGhosts: number;
  defensiveMovesAwayFromGhosts: number;
  pelletGreedLevel: number; // 0-1, how much player prioritizes pellets
  powerPelletUsage: number; // How effectively player uses power pellets
  averageDistanceFromGhosts: number;
  ghostsEaten: number;
  deathsByGhost: Record<string, number>;
}

export interface GhostInteraction {
  timestamp: number;
  ghostId: string;
  interactionType: 'chase' | 'flee' | 'ambush' | 'avoid' | 'eaten';
  pacmanPosition: Position;
  ghostPosition: Position;
  distance: number;
  powerPelletActive: boolean;
}

export enum PacManCommentaryTrigger {
  GAME_START = 'game_start',
  GHOST_BEHAVIOR_CHANGE = 'ghost_behavior_change',
  POWER_PELLET_ACTIVATED = 'power_pellet_activated',
  GHOST_EATEN = 'ghost_eaten',
  PACMAN_DEATH = 'pacman_death',
  AGGRESSIVE_PLAY = 'aggressive_play',
  DEFENSIVE_PLAY = 'defensive_play',
  GAME_END = 'game_end'
}

export interface PacManCommentaryContext {
  trigger: PacManCommentaryTrigger;
  ghostPersonalities?: GhostPersonalityState[];
  playerBehavior?: 'aggressive' | 'defensive' | 'greedy' | 'cautious';
  ghostId?: string;
  behaviorDescription?: string;
}