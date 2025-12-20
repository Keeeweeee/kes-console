// AI System Types - Data structures for behavior analysis and commentary

export enum SkillLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate', 
  ADVANCED = 'advanced',
  EXPERT = 'expert'
}

export enum EmotionalState {
  CALM = 'calm',
  EXCITED = 'excited',
  FRUSTRATED = 'frustrated',
  FOCUSED = 'focused',
  BORED = 'bored'
}

export enum CommentaryStyle {
  ENCOURAGING = 'encouraging',
  CHALLENGING = 'challenging',
  HUMOROUS = 'humorous',
  ANALYTICAL = 'analytical'
}

export interface BehaviorPattern {
  reactionTime: number
  decisionSpeed: number
  accuracyRate: number
  consistencyScore: number
  adaptabilityIndex: number
}

export interface AIAdaptation {
  timestamp: Date
  gameType: string
  adaptationType: 'difficulty' | 'commentary' | 'hints'
  parameters: Record<string, any>
  reason: string
}