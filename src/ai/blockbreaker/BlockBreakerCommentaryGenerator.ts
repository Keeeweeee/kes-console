// Block Breaker AI - Sarcastic performance commentary generator

import { 
  BlockBreakerBehaviorData, 
  BlockBreakerPerformanceMetrics,
  FAILURE_ZONES 
} from './BlockBreakerBehaviorTypes'

export class BlockBreakerCommentaryGenerator {
  
  generateGameStartCommentary(behaviorData: BlockBreakerBehaviorData): string {
    if (behaviorData.gamesPlayed === 0) {
      return "► BLOCK BREAKER LOADED... TRY NOT TO MISS THE PADDLE THIS TIME"
    }
    
    if (behaviorData.mostFailedZone) {
      const zoneText = this.getZoneDescription(behaviorData.mostFailedZone)
      return `► BACK FOR MORE? WATCH THAT ${zoneText.toUpperCase()}... YOU'VE MISSED THERE ${behaviorData.failureZones.get(behaviorData.mostFailedZone)} TIMES`
    }
    
    if (behaviorData.consecutiveMisses > 3) {
      return "► MAYBE THIS TIME YOU'LL HIT THE BALL... OPTIMISM IS KEY"
    }
    
    return "► BLOCK BREAKER READY... SHOW ME WHAT YOU'VE LEARNED"
  }

  generateMissCommentary(
    behaviorData: BlockBreakerBehaviorData, 
    metrics: BlockBreakerPerformanceMetrics
  ): string {
    // Add miss-specific commentary
    const missCommentaries = [
      "► YOU MISSED. I NOTICED.",
      "► BALL LOST... PREDICTABLE.",
      "► MISSED AGAIN... CONSISTENCY.",
      "► PADDLE POSITIONING NEEDS WORK."
    ]
    
    if (!metrics.shouldCommentOnMiss || !metrics.lastMissLocation) {
      return missCommentaries[Math.floor(Math.random() * missCommentaries.length)]
    }
    
    const zone = metrics.repeatedFailureZone
    if (!zone) return this.getGenericMissCommentary(behaviorData)
    
    const zoneText = this.getZoneDescription(zone)
    const count = metrics.failureZoneCount
    
    if (metrics.shouldEscalateSarcasm) {
      return this.getEscalatedSarcasmCommentary(zoneText, count)
    }
    
    return this.getRepeatedFailureCommentary(zoneText, count)
  }

  generateImprovementCommentary(
    behaviorData: BlockBreakerBehaviorData,
    metrics: BlockBreakerPerformanceMetrics
  ): string {
    if (!metrics.shouldCommentOnImprovement) {
      return this.getProgressCommentary(behaviorData)
    }
    
    const grudgingPraise = [
      "► FINE... THAT WAS SLIGHTLY LESS TERRIBLE",
      "► I SUPPOSE THAT COUNTS AS IMPROVEMENT",
      "► WELL WELL... SOMEONE'S BEEN PRACTICING",
      "► NOT BAD... FOR A HUMAN",
      "► FINALLY SHOWING SOME COORDINATION"
    ]
    
    return grudgingPraise[Math.floor(Math.random() * grudgingPraise.length)]
  }

  generateRallyCommentary(rallyLength: number, behaviorData: BlockBreakerBehaviorData): string {
    // Add specific rally commentary for corruption triggers
    const rallyCommentaries = [
      "► YOU KEEP AIMING STRAIGHT. PREDICTABLE.",
      "► SAME ANGLE AGAIN... BORING.",
      "► RALLY DETECTED. TIME FOR CHANGES.",
      "► COMFORTABLE? NOT FOR LONG."
    ]
    
    if (rallyLength < 3) {
      return "► SHORT RALLY... PADDLE CONTROL NEEDS WORK"
    }
    
    if (rallyLength >= 10) {
      const avgRally = behaviorData.averageRallyLength
      if (rallyLength > avgRally * 1.5) {
        return rallyCommentaries[Math.floor(Math.random() * rallyCommentaries.length)]
      }
      return `► ${rallyLength} HIT RALLY... KEEP IT UP`
    }
    
    if (rallyLength >= 5) {
      return "► DECENT RALLY... DON'T GET COCKY"
    }
    
    return "► RALLY BUILDING... TRY TO MAINTAIN FOCUS"
  }

  generateGameEndCommentary(
    result: 'won' | 'lost',
    score: number,
    behaviorData: BlockBreakerBehaviorData
  ): string {
    if (result === 'won') {
      if (score > behaviorData.bestScore) {
        return "► VICTORY AND A NEW HIGH SCORE... MIRACLES DO HAPPEN"
      }
      return "► YOU WON... EVEN A BROKEN CLOCK IS RIGHT TWICE A DAY"
    }
    
    // Lost game commentary
    if (behaviorData.consecutiveMisses >= 3) {
      return "► GAME OVER... MAYBE TRY MOVING THE PADDLE NEXT TIME"
    }
    
    if (behaviorData.mostFailedZone) {
      const zoneText = this.getZoneDescription(behaviorData.mostFailedZone)
      return `► LOST AGAIN... THAT ${zoneText.toUpperCase()} IS STILL YOUR WEAKNESS`
    }
    
    return "► GAME OVER... PRACTICE MAKES... WELL, LESS TERRIBLE"
  }

  private getZoneDescription(zone: string): string {
    switch (zone) {
      case FAILURE_ZONES.LEFT_EDGE: return "left edge"
      case FAILURE_ZONES.RIGHT_EDGE: return "right edge"
      case FAILURE_ZONES.CENTER: return "center"
      case FAILURE_ZONES.LEFT_SIDE: return "left side"
      case FAILURE_ZONES.RIGHT_SIDE: return "right side"
      default: return "area"
    }
  }

  private getGenericMissCommentary(behaviorData: BlockBreakerBehaviorData): string {
    const genericMisses = [
      "► MISSED... PADDLE POSITIONING NEEDS WORK",
      "► BALL LOST... REACTION TIME COULD BE FASTER",
      "► MISS... FOCUS ON THE BALL TRAJECTORY",
      "► DROPPED IT... ANTICIPATION IS KEY",
      "► BALL GONE... MAYBE WATCH WHERE IT'S GOING"
    ]
    
    if (behaviorData.consecutiveMisses >= 2) {
      return "► ANOTHER MISS... CONSISTENCY IS CLEARLY NOT YOUR STRENGTH"
    }
    
    return genericMisses[Math.floor(Math.random() * genericMisses.length)]
  }

  private getRepeatedFailureCommentary(zoneText: string, count: number): string {
    const templates = [
      `► MISSED ${zoneText.toUpperCase()} AGAIN... THAT'S ${count} TIMES NOW`,
      `► ${zoneText.toUpperCase()} FAILURE #${count}... SEEING A PATTERN HERE`,
      `► ANOTHER ${zoneText.toUpperCase()} MISS... ${count} AND COUNTING`,
      `► ${zoneText.toUpperCase()} STRIKES AGAIN... ${count} TIMES IS A HABIT`
    ]
    
    return templates[Math.floor(Math.random() * templates.length)]
  }

  private getEscalatedSarcasmCommentary(zoneText: string, count: number): string {
    const escalated = [
      `► SERIOUSLY? ${zoneText.toUpperCase()} AGAIN? THAT'S ${count} TIMES!`,
      `► ${count} ${zoneText.toUpperCase()} MISSES... MAYBE AVOID THAT AREA?`,
      `► ${zoneText.toUpperCase()} IS YOUR NEMESIS... ${count} FAILURES PROVE IT`,
      `► ${count} TIMES IN THE ${zoneText.toUpperCase()}... IMPRESSIVE CONSISTENCY`,
      `► DEFINITION OF INSANITY: ${count} ${zoneText.toUpperCase()} MISSES`
    ]
    
    return escalated[Math.floor(Math.random() * escalated.length)]
  }

  private getProgressCommentary(behaviorData: BlockBreakerBehaviorData): string {
    if (behaviorData.improvementTrend === 'improving') {
      return "► SLIGHT IMPROVEMENT DETECTED... DON'T LET IT GO TO YOUR HEAD"
    }
    
    if (behaviorData.improvementTrend === 'declining') {
      return "► PERFORMANCE DECLINING... BACK TO BASICS PERHAPS?"
    }
    
    if (behaviorData.averageRallyLength > 5) {
      return "► RALLY AVERAGE ACCEPTABLE... BARELY"
    }
    
    return "► STEADY PERFORMANCE... MEDIOCRITY ACHIEVED"
  }

  // New corruption-specific commentary methods
  generatePaddleShrinkCommentary(): string {
    const shrinkCommentaries = [
      "► OH WOW! THE PADDLE JUST SHRUNK.",
      "► PADDLE FEELS SMALLER? GOOD.",
      "► LESS PADDLE, MORE CHALLENGE.",
      "► SHRINKAGE DETECTED. ADAPT."
    ]
    return shrinkCommentaries[Math.floor(Math.random() * shrinkCommentaries.length)]
  }

  generatePaddleDriftCommentary(): string {
    const driftCommentaries = [
      "► GASP!! IS THE PADDLE MOVING ON ITS OWN?",
      "► PADDLE DRIFT ENGAGED. FIGHT IT.",
      "► CONTROLS FEEL LOOSE? FEATURE, NOT BUG.",
      "► PADDLE INDEPENDENCE ACTIVATED."
    ]
    return driftCommentaries[Math.floor(Math.random() * driftCommentaries.length)]
  }

  generateBlockRegenerationCommentary(): string {
    const regenCommentaries = [
      "► THAT BRICK DIDN'T BREAK. NEITHER DID YOU.",
      "► THAT DIDN'T BREAK. TRY AGAIN.",
      "► BLOCK REGENERATION... SURPRISE!",
      "► SOME BLOCKS ARE STUBBORN."
    ]
    return regenCommentaries[Math.floor(Math.random() * regenCommentaries.length)]
  }

  generateSpeedSpikeCommentary(): string {
    const spikeCommentaries = [
      "► SPEED BOOST! KEEP UP.",
      "► FASTER NOW. ADAPT OR FAIL.",
      "► VELOCITY INCREASED. ENJOY.",
      "► TOO SLOW. ACCELERATING."
    ]
    return spikeCommentaries[Math.floor(Math.random() * spikeCommentaries.length)]
  }
}