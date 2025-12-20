// Storage abstraction for Global AI Memory persistence

import { GlobalBehaviorData } from '../ConsoleBehaviorTypes';

export interface GlobalMemoryStore {
  load(): Promise<GlobalBehaviorData | null>;
  save(data: GlobalBehaviorData): Promise<void>;
}