// HTTP-based memory store for Global AI Memory via API Gateway

import { GlobalMemoryStore } from './GlobalMemoryStore';
import { GlobalBehaviorData } from '../ConsoleBehaviorTypes';

interface ApiResponse<T> {
  data: T;
  success?: boolean;
  message?: string;
}

interface SaveRequest {
  userId: string;
  data: GlobalBehaviorData;
}

export class HttpMemoryStore implements GlobalMemoryStore {
  private baseUrl: string;
  private userId: string;

  constructor(baseUrl: string, userId: string = 'default-user') {
    // Remove trailing slash if present
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.userId = userId;
  }

  async load(): Promise<GlobalBehaviorData | null> {
    try {
      const url = `${this.baseUrl}/memory?userId=${encodeURIComponent(this.userId)}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: ApiResponse<GlobalBehaviorData | null> = await response.json();
      return result.data || null;
    } catch (error) {
      console.error('Failed to load from HTTP memory store:', error);
      throw error;
    }
  }

  async save(data: GlobalBehaviorData): Promise<void> {
    try {
      const url = `${this.baseUrl}/memory`;
      const payload: SaveRequest = {
        userId: this.userId,
        data: data,
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: ApiResponse<any> = await response.json();
      
      if (result.success === false) {
        throw new Error(result.message || 'Save operation failed');
      }
    } catch (error) {
      console.error('Failed to save to HTTP memory store:', error);
      throw error;
    }
  }
}