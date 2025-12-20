// Ghost Personality AI - Implements distinct ghost behaviors

import { Position, Direction, Ghost, PacManGameData, GhostState } from '../../games/pacman/PacManGame';
import { GhostPersonalityState } from './PacManAITypes';

export class GhostPersonalityAI {
  private personalityStates: Map<string, GhostPersonalityState> = new Map();
  private readonly SPAWN_BOX_EXIT = { x: 10, y: 8 }; // Exit tile for spawn box

  initializeGhost(ghost: Ghost): void {
    this.personalityStates.set(ghost.id, {
      ghostId: ghost.id,
      personality: ghost.personality,
      currentBehavior: 'patrol',
      targetPosition: null,
      aggressionLevel: this.getBaseAggression(ghost.personality),
      fearLevel: 0,
      lastDecision: 'initialized'
    });
  }

  private getBaseAggression(personality: 'loner' | 'bully' | 'mimic' | 'strategist'): number {
    switch (personality) {
      case 'loner': return 0.3;
      case 'bully': return 0.8;
      case 'mimic': return 0.5;
      case 'strategist': return 0.6;
    }
  }

  updateGhostBehavior(gameData: PacManGameData): Map<string, Direction> {
    const moves = new Map<string, Direction>();
    const chainAttempts = new Map<string, Direction>();
    const speechTriggers = new Map<string, string>();

    for (const ghost of gameData.ghosts) {
      // STRICT RESURRECTION CONTRACT: Handle eaten and reviving ghosts
      if (ghost.state === GhostState.EATEN || ghost.state === GhostState.REVIVING) {
        // These ghosts MUST remain immobile
        // Do not add to moves or chainAttempts
        continue;
      }

      const state = this.personalityStates.get(ghost.id);
      if (!state) continue;

      // Update fear level based on ghost state
      state.fearLevel = ghost.state === GhostState.FRIGHTENED ? 0.9 : 0;

      // Check for speech triggers based on personality
      const speechText = this.checkSpeechTriggers(ghost, gameData);
      if (speechText) {
        speechTriggers.set(ghost.id, speechText);
      }

      let preferredDirection: Direction;
      
      // Check if ghost just revived and needs spawn-exit movement
      if (this.isInSpawnBox(ghost.position) && ghost.movementSegment === null) {
        // Force spawn-exit movement for newly revived ghosts
        console.log(`[${ghost.id.toUpperCase()}] First movement after revival - forcing spawn exit`);
        preferredDirection = this.getDirectionToward(ghost.position, this.SPAWN_BOX_EXIT);
        state.currentBehavior = 'exiting_spawn';
        state.lastDecision = 'forced spawn exit after revival';
      } else if (ghost.state === GhostState.FRIGHTENED) {
        // All ghosts flee when frightened
        preferredDirection = this.getFleeDirection(ghost, gameData, state);
        state.currentBehavior = 'fleeing';
      } else {
        // Normal behavior based on personality
        preferredDirection = this.getPersonalityDirection(ghost, gameData, state);
      }

      // CRITICAL: Resolve direction to ensure it's valid
      const resolvedDirection = this.resolveDirection(ghost, gameData, preferredDirection);

      // If ghost has active segment, attempt lookahead chaining
      if (ghost.movementSegment !== null) {
        // Provide direction for potential chaining
        if (resolvedDirection !== Direction.NONE) {
          chainAttempts.set(ghost.id, resolvedDirection);
        }
        continue; // Don't add to moves (not idle)
      }

      // Ghost is idle - MUST provide direction (especially after revival)
      if (resolvedDirection !== Direction.NONE) {
        moves.set(ghost.id, resolvedDirection);
        
        // Log first movement after revival
        if (this.isInSpawnBox(ghost.position)) {
          console.log(`[${ghost.id.toUpperCase()}] First movement after revival: ${resolvedDirection}`);
        }
      } else {
        // Fallback: if no valid direction, continue current direction or pick any valid direction
        const fallbackDirection = this.getFallbackDirection(ghost, gameData);
        if (fallbackDirection !== Direction.NONE) {
          moves.set(ghost.id, fallbackDirection);
          console.warn(`[${ghost.id.toUpperCase()}] Using fallback direction: ${fallbackDirection}`);
        }
      }
    }

    // Store chain attempts and speech triggers for external system to use
    this.lastChainAttempts = chainAttempts;
    this.lastSpeechTriggers = speechTriggers;

    return moves;
  }

  private lastSpeechTriggers: Map<string, string> = new Map();

  getSpeechTriggers(): Map<string, string> {
    return this.lastSpeechTriggers;
  }

  private lastChainAttempts: Map<string, Direction> = new Map();

  getChainAttempts(): Map<string, Direction> {
    return this.lastChainAttempts;
  }

  private getPersonalityDirection(
    ghost: Ghost, 
    gameData: PacManGameData, 
    state: GhostPersonalityState
  ): Direction {
    switch (ghost.personality) {
      case 'loner':
        return this.getLonerBehavior(ghost, gameData, state);
      case 'bully':
        return this.getBullyBehavior(ghost, gameData, state);
      case 'mimic':
        return this.getMimicBehavior(ghost, gameData, state);
      case 'strategist':
        return this.getStrategistBehavior(ghost, gameData, state);
      default:
        return Direction.UP;
    }
  }

  private getLonerBehavior(
    ghost: Ghost, 
    gameData: PacManGameData, 
    state: GhostPersonalityState
  ): Direction {
    const pacmanPos = gameData.pacman.position;
    const distanceToPacman = this.getDistance(ghost.position, pacmanPos);
    
    // CORE INTENT: Always pursue Pac-Man
    const basePursuitDirection = this.getDirectionToward(ghost.position, pacmanPos);
    
    // PERSONALITY MODIFIER: Avoid other ghosts when paths conflict
    const otherGhosts = gameData.ghosts.filter(g => 
      g.id !== ghost.id && g.state !== GhostState.EATEN && g.state !== GhostState.REVIVING
    );
    const nearbyGhosts = otherGhosts.filter(g => 
      this.getDistance(ghost.position, g.position) < 3 // Reduced avoidance range
    );

    if (nearbyGhosts.length > 0) {
      // Check if avoiding ghost conflicts with pursuing Pac-Man
      const avoidDirection = this.getDirectionAwayFrom(ghost.position, nearbyGhosts[0].position);
      
      // Only avoid if it doesn't completely oppose Pac-Man pursuit
      if (this.areDirectionsCompatible(basePursuitDirection, avoidDirection)) {
        state.currentBehavior = 'avoiding_ghosts_while_pursuing';
        state.lastDecision = 'taking alternate route to Pac-Man';
        return avoidDirection;
      }
    }

    // PERSONALITY MODIFIER: Brief hesitation when very close to Pac-Man
    if (distanceToPacman < 3 && Math.random() < 0.3) {
      // Brief hesitation - pause for one decision cycle
      state.currentBehavior = 'hesitant_pursuit';
      state.lastDecision = 'hesitating briefly';
      return ghost.direction; // Continue current direction
    }

    // Default: Direct pursuit of Pac-Man
    state.currentBehavior = 'pursuing_pacman';
    state.lastDecision = 'chasing Pac-Man alone';
    return basePursuitDirection;
  }

  private getBullyBehavior(
    ghost: Ghost, 
    gameData: PacManGameData, 
    state: GhostPersonalityState
  ): Direction {
    const pacmanPos = gameData.pacman.position;
    const distanceToPacman = this.getDistance(ghost.position, pacmanPos);
    
    // CORE INTENT: Always pursue Pac-Man aggressively
    const basePursuitDirection = this.getDirectionToward(ghost.position, pacmanPos);
    
    // PERSONALITY MODIFIER: Briefly intimidate other ghosts along the way
    const otherGhosts = gameData.ghosts.filter(g => 
      g.id !== ghost.id && g.state !== GhostState.EATEN && g.state !== GhostState.REVIVING
    );
    
    // Only intimidate if another ghost is directly in path to Pac-Man
    for (const otherGhost of otherGhosts) {
      const distanceToOther = this.getDistance(ghost.position, otherGhost.position);
      const otherDistanceToPacman = this.getDistance(otherGhost.position, pacmanPos);
      
      // Only pressure if other ghost is between bully and Pac-Man
      if (distanceToOther < 2 && otherDistanceToPacman < distanceToPacman) {
        state.currentBehavior = 'pressuring_ghost';
        state.lastDecision = `intimidating ${otherGhost.id} briefly`;
        // Push ghost toward Pac-Man, not away from pursuit
        return this.getDirectionToward(ghost.position, otherGhost.position);
      }
    }

    // Direct aggressive pursuit of Pac-Man
    state.currentBehavior = 'aggressive_chase';
    state.lastDecision = 'aggressively chasing Pac-Man';
    state.aggressionLevel = Math.min(1, state.aggressionLevel + 0.1);
    return basePursuitDirection;
  }

  private getMimicBehavior(
    ghost: Ghost, 
    gameData: PacManGameData, 
    state: GhostPersonalityState
  ): Direction {
    const pacmanPos = gameData.pacman.position;
    
    // CORE INTENT: Always pursue Pac-Man
    const basePursuitDirection = this.getDirectionToward(ghost.position, pacmanPos);
    
    // PERSONALITY MODIFIER: Make inefficient path decisions (Lost Ghost)
    // Occasionally take wrong turns but stay directionally correct
    const shouldMakeMistake = Math.random() < 0.25; // 25% chance of inefficiency
    
    if (shouldMakeMistake) {
      // Take a perpendicular direction instead of optimal
      const perpendicularDirections = this.getPerpendicularDirections(basePursuitDirection);
      const randomPerpendicular = perpendicularDirections[Math.floor(Math.random() * perpendicularDirections.length)];
      
      state.currentBehavior = 'inefficient_pursuit';
      state.lastDecision = 'taking inefficient path';
      return randomPerpendicular;
    }

    // PERSONALITY MODIFIER: Delayed decision making
    // Sometimes continue in current direction even if suboptimal
    if (Math.random() < 0.2) {
      state.currentBehavior = 'delayed_correction';
      state.lastDecision = 'slow to adjust path';
      return ghost.direction; // Continue current direction
    }

    // Default: Pursue Pac-Man (but with occasional mistakes)
    state.currentBehavior = 'pursuing_pacman';
    state.lastDecision = 'attempting to chase Pac-Man';
    return basePursuitDirection;
  }

  private getStrategistBehavior(
    ghost: Ghost, 
    gameData: PacManGameData, 
    state: GhostPersonalityState
  ): Direction {
    const pacmanPos = gameData.pacman.position;
    const pacmanDirection = gameData.pacman.direction;
    
    // CORE INTENT: Predict Pac-Man's future position and intercept
    const predictedPos = this.predictPacManPosition(pacmanPos, pacmanDirection, gameData.maze, 4);
    
    // Target predicted position instead of current position
    const interceptDirection = this.getDirectionToward(ghost.position, predictedPos);
    
    // PERSONALITY MODIFIER: Slight hesitation (calculating feel)
    if (Math.random() < 0.15) { // 15% chance of hesitation
      state.currentBehavior = 'calculating';
      state.lastDecision = 'analyzing optimal path';
      return ghost.direction; // Continue current direction while "thinking"
    }
    
    // Default: Move toward predicted interception point
    state.currentBehavior = 'intercepting';
    state.lastDecision = `targeting predicted position (${predictedPos.x}, ${predictedPos.y})`;
    return interceptDirection;
  }

  private predictPacManPosition(
    currentPos: Position, 
    direction: Direction, 
    maze: any[][], 
    tilesAhead: number
  ): Position {
    let predictedPos = { ...currentPos };
    
    // Predict future position by simulating movement
    for (let i = 0; i < tilesAhead; i++) {
      const nextPos = this.getNextPosition(predictedPos, direction);
      
      // Stop prediction if wall encountered
      if (!this.isValidMove(nextPos, maze)) {
        break;
      }
      
      predictedPos = nextPos;
    }
    
    return predictedPos;
  }

  private getFleeDirection(
    ghost: Ghost, 
    gameData: PacManGameData, 
    state: GhostPersonalityState
  ): Direction {
    const pacmanPos = gameData.pacman.position;
    
    // Personality affects fleeing behavior
    switch (ghost.personality) {
      case 'loner':
        // Loner flees to corners, away from everyone
        state.lastDecision = 'fleeing to isolation';
        return this.getDirectionToCorner(ghost.position, gameData);
      
      case 'bully':
        // Bully flees but tries to stay near other ghosts for protection
        state.lastDecision = 'fleeing but seeking backup';
        const otherGhosts = gameData.ghosts.filter(g => 
          g.id !== ghost.id && g.state !== GhostState.EATEN && g.state !== GhostState.REVIVING
        );
        if (otherGhosts.length > 0) {
          const nearestGhost = otherGhosts[0]; // Simplified
          const directionToGhost = this.getDirectionToward(ghost.position, nearestGhost.position);
          const directionFromPacman = this.getDirectionAwayFrom(ghost.position, pacmanPos);
          // Try to balance both directions
          return Math.random() < 0.7 ? directionFromPacman : directionToGhost;
        }
        return this.getDirectionAwayFrom(ghost.position, pacmanPos);
      
      case 'mimic':
        // Mimic flees in same direction as other fleeing ghosts
        state.lastDecision = 'fleeing with the group';
        const fleeingGhosts = gameData.ghosts.filter(g => 
          g.id !== ghost.id && g.state === GhostState.FRIGHTENED
        );
        if (fleeingGhosts.length > 0) {
          // Follow other fleeing ghosts
          return this.getDirectionToward(ghost.position, fleeingGhosts[0].position);
        }
        return this.getDirectionAwayFrom(ghost.position, pacmanPos);
      
      default:
        return this.getDirectionAwayFrom(ghost.position, pacmanPos);
    }
  }

  // Helper methods
  private getDistance(pos1: Position, pos2: Position): number {
    return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
  }

  private getNextPosition(pos: Position, direction: Direction): Position {
    switch (direction) {
      case Direction.UP:
        return { x: pos.x, y: pos.y - 1 };
      case Direction.DOWN:
        return { x: pos.x, y: pos.y + 1 };
      case Direction.LEFT:
        return { x: pos.x - 1, y: pos.y };
      case Direction.RIGHT:
        return { x: pos.x + 1, y: pos.y };
      default:
        return pos;
    }
  }

  private isValidMove(pos: Position, maze: any[][]): boolean {
    if (pos.y < 0 || pos.y >= maze.length) return false;
    if (pos.x < 0 || pos.x >= maze[0].length) return true; // Allow tunnel
    return maze[pos.y][pos.x] !== '#'; // Not a wall
  }

  private isInSpawnBox(pos: Position): boolean {
    // Spawn box is roughly x: 8-12, y: 8-10
    return pos.x >= 8 && pos.x <= 12 && pos.y >= 8 && pos.y <= 10;
  }

  private getValidDirections(ghost: Ghost, gameData: PacManGameData): Direction[] {
    const validDirs: Direction[] = [];
    const allDirections = [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT];
    
    // Get reverse direction to avoid
    const reverseDir = this.getReverseDirection(ghost.direction);
    
    for (const dir of allDirections) {
      const nextPos = this.getNextPosition(ghost.position, dir);
      if (this.isValidMove(nextPos, gameData.maze)) {
        validDirs.push(dir);
      }
    }
    
    // If we have multiple valid directions, exclude reverse
    if (validDirs.length > 1) {
      const filtered = validDirs.filter(d => d !== reverseDir);
      if (filtered.length > 0) {
        return filtered;
      }
    }
    
    return validDirs;
  }

  private getReverseDirection(direction: Direction): Direction {
    switch (direction) {
      case Direction.UP: return Direction.DOWN;
      case Direction.DOWN: return Direction.UP;
      case Direction.LEFT: return Direction.RIGHT;
      case Direction.RIGHT: return Direction.LEFT;
      default: return Direction.NONE;
    }
  }

  private resolveDirection(
    ghost: Ghost,
    gameData: PacManGameData,
    preferredDirection: Direction
  ): Direction {
    // Get all valid directions
    const validDirs = this.getValidDirections(ghost, gameData);
    
    if (validDirs.length === 0) {
      return Direction.NONE; // No valid moves (trapped)
    }
    
    // Check if in spawn box - force escape
    if (this.isInSpawnBox(ghost.position)) {
      return this.getSpawnEscapeDirection(ghost, gameData, validDirs);
    }
    
    // If preferred direction is valid, use it
    if (validDirs.includes(preferredDirection)) {
      return preferredDirection;
    }
    
    // Otherwise, choose best valid direction based on distance to Pac-Man
    return this.chooseBestDirection(ghost, gameData, validDirs);
  }

  private getFallbackDirection(ghost: Ghost, gameData: PacManGameData): Direction {
    // Emergency fallback: pick ANY valid direction to prevent idling
    const validDirs = this.getValidDirections(ghost, gameData);
    
    if (validDirs.length === 0) {
      return Direction.NONE; // Truly trapped
    }
    
    // Prefer continuing current direction if valid
    if (validDirs.includes(ghost.direction)) {
      return ghost.direction;
    }
    
    // Otherwise pick first valid direction
    return validDirs[0];
  }

  private getSpawnEscapeDirection(
    ghost: Ghost,
    gameData: PacManGameData,
    validDirs: Direction[]
  ): Direction {
    // Score each valid direction by distance to exit
    let bestDir = validDirs[0];
    let bestScore = Infinity;
    
    for (const dir of validDirs) {
      const nextPos = this.getNextPosition(ghost.position, dir);
      const distanceToExit = this.getDistance(nextPos, this.SPAWN_BOX_EXIT);
      
      if (distanceToExit < bestScore) {
        bestScore = distanceToExit;
        bestDir = dir;
      }
    }
    
    return bestDir;
  }

  private chooseBestDirection(
    ghost: Ghost,
    gameData: PacManGameData,
    validDirs: Direction[]
  ): Direction {
    const pacmanPos = gameData.pacman.position;
    let bestDir = validDirs[0];
    let bestScore = Infinity;
    
    for (const dir of validDirs) {
      const nextPos = this.getNextPosition(ghost.position, dir);
      let score = this.getDistance(nextPos, pacmanPos);
      
      // Apply personality modifiers as score adjustments
      switch (ghost.personality) {
        case 'loner':
          // Slightly prefer paths away from other ghosts
          const otherGhosts = gameData.ghosts.filter(g => g.id !== ghost.id);
          for (const other of otherGhosts) {
            const distToOther = this.getDistance(nextPos, other.position);
            if (distToOther < 3) {
              score -= 0.5; // Small penalty for being near others
            }
          }
          break;
        case 'bully':
          // Slightly prefer more aggressive paths
          score *= 0.9; // 10% more aggressive
          break;
        case 'mimic':
          // Occasionally add randomness
          if (Math.random() < 0.2) {
            score += Math.random() * 2 - 1; // Add noise
          }
          break;
      }
      
      if (score < bestScore) {
        bestScore = score;
        bestDir = dir;
      }
    }
    
    return bestDir;
  }

  private areDirectionsCompatible(dir1: Direction, dir2: Direction): boolean {
    // Check if two directions are not directly opposite
    const opposites: Record<Direction, Direction> = {
      [Direction.UP]: Direction.DOWN,
      [Direction.DOWN]: Direction.UP,
      [Direction.LEFT]: Direction.RIGHT,
      [Direction.RIGHT]: Direction.LEFT,
      [Direction.NONE]: Direction.NONE
    };
    
    return opposites[dir1] !== dir2;
  }

  private getPerpendicularDirections(direction: Direction): Direction[] {
    switch (direction) {
      case Direction.UP:
      case Direction.DOWN:
        return [Direction.LEFT, Direction.RIGHT];
      case Direction.LEFT:
      case Direction.RIGHT:
        return [Direction.UP, Direction.DOWN];
      default:
        return [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT];
    }
  }

  private getDirectionToward(from: Position, to: Position): Direction {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? Direction.RIGHT : Direction.LEFT;
    } else {
      return dy > 0 ? Direction.DOWN : Direction.UP;
    }
  }

  private getDirectionAwayFrom(from: Position, away: Position): Direction {
    const dx = from.x - away.x;
    const dy = from.y - away.y;
    
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? Direction.RIGHT : Direction.LEFT;
    } else {
      return dy > 0 ? Direction.DOWN : Direction.UP;
    }
  }

  private getDirectionToCorner(position: Position, gameData: PacManGameData): Direction {
    const mazeWidth = gameData.maze[0]?.length || 21;
    const mazeHeight = gameData.maze?.length || 21;
    
    // Find nearest corner
    const corners = [
      { x: 1, y: 1 },
      { x: mazeWidth - 2, y: 1 },
      { x: 1, y: mazeHeight - 2 },
      { x: mazeWidth - 2, y: mazeHeight - 2 }
    ];
    
    let nearestCorner = corners[0];
    let nearestDistance = this.getDistance(position, nearestCorner);
    
    for (const corner of corners) {
      const distance = this.getDistance(position, corner);
      if (distance < nearestDistance) {
        nearestCorner = corner;
        nearestDistance = distance;
      }
    }
    
    return this.getDirectionToward(position, nearestCorner);
  }

  private checkSpeechTriggers(ghost: Ghost, gameData: PacManGameData): string | null {
    const pacmanPos = gameData.pacman.position;
    const distanceToPacman = this.getDistance(ghost.position, pacmanPos);
    
    switch (ghost.personality) {
      case 'bully':
        return this.getBullySpeech(ghost, gameData, distanceToPacman);
      case 'loner':
        return this.getLonerSpeech(ghost, gameData);
      case 'mimic':
        return this.getLostSpeech(ghost);
      case 'strategist':
        return this.getStrategistSpeech(ghost, gameData);
      default:
        return null;
    }
  }

  private getBullySpeech(ghost: Ghost, gameData: PacManGameData, distanceToPacman: number): string | null {
    // Trigger 1: When Pac-Man nearby
    if (distanceToPacman <= 3) {
      return "RUN 😈";
    }

    // Trigger 2: When Loner enters nearby radius
    const loner = gameData.ghosts.find(g => g.personality === 'loner');
    if (loner && this.getDistance(ghost.position, loner.position) <= 2) {
      return "BOO! HAHA";
    }

    // Trigger 3: When another ghost in path
    const otherGhosts = gameData.ghosts.filter(g => 
      g.id !== ghost.id && g.state !== GhostState.EATEN && g.state !== GhostState.REVIVING
    );
    for (const other of otherGhosts) {
      if (this.getDistance(ghost.position, other.position) <= 1) {
        return "Move Idiot";
      }
    }

    return null;
  }

  private getLonerSpeech(ghost: Ghost, gameData: PacManGameData): string | null {
    // Trigger 1: When Bully enters nearby radius
    const bully = gameData.ghosts.find(g => g.personality === 'bully');
    if (bully && this.getDistance(ghost.position, bully.position) <= 2) {
      return "AHH!";
    }

    // Trigger 2: When surrounded by 1+ ghosts
    const nearbyGhosts = gameData.ghosts.filter(g => 
      g.id !== ghost.id && 
      g.state !== GhostState.EATEN && 
      g.state !== GhostState.REVIVING &&
      this.getDistance(ghost.position, g.position) <= 2
    );
    
    if (nearbyGhosts.length >= 1) {
      return "😣";
    }

    return null;
  }

  private getLostSpeech(ghost: Ghost): string | null {
    // Low-frequency confusion events (random chance)
    if (Math.random() < 0.05) { // 5% chance per update
      const speeches = ["Huh?", "Help?", "🆘", "I'm lost...", "Not again"];
      return speeches[Math.floor(Math.random() * speeches.length)];
    }

    return null;
  }

  private getStrategistSpeech(ghost: Ghost, gameData: PacManGameData): string | null {
    const pacmanPos = gameData.pacman.position;
    const distanceToPacman = this.getDistance(ghost.position, pacmanPos);
    
    // Trigger on successful interception setup (close to Pac-Man)
    if (distanceToPacman <= 2) {
      return "Cornered.";
    }
    
    // Trigger on direction change or calculation moments (low frequency)
    if (Math.random() < 0.03) { // 3% chance per update
      const speeches = ["Hmm…", "Interesting."];
      return speeches[Math.floor(Math.random() * speeches.length)];
    }

    return null;
  }

  // Public getters for AI state
  getGhostPersonalityStates(): GhostPersonalityState[] {
    return Array.from(this.personalityStates.values());
  }

  getGhostState(ghostId: string): GhostPersonalityState | undefined {
    return this.personalityStates.get(ghostId);
  }
}