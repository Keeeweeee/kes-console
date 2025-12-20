// Local storage implementation for Global AI Memory

import { GlobalMemoryStore } from './GlobalMemoryStore';
import { GlobalBehaviorData } from '../ConsoleBehaviorTypes';
import { StorageManager } from '../../../storage/StorageManager';

const STORAGE_KEY = 'retro_console_global_behavior';

export class LocalMemoryStore implements GlobalMemoryStore {
  private storage: StorageManager;

  constructor() {
    this.storage = StorageManager.getInstance();
  }

  async load(): Promise<GlobalBehaviorData | null> {
    try {
      const stored = this.storage.getItem<GlobalBehaviorData>(STORAGE_KEY);
      return stored || null;
    } catch (error) {
      console.warn('Failed to load from localStorage:', error);
      return null;
    }
  }

  async save(data: GlobalBehaviorData): Promise<void> {
    try {
      this.storage.setItem(STORAGE_KEY, data);
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
      throw error;
    }
  }
}