// DynamoDB storage implementation for Global AI Memory (DEPRECATED)
// WARNING: This implementation is deprecated. Use HttpMemoryStore instead.
// Direct AWS SDK usage in frontend is not recommended for security reasons.

import { GlobalMemoryStore } from './GlobalMemoryStore';
import { GlobalBehaviorData } from '../ConsoleBehaviorTypes';

// AWS SDK v3 imports (only loaded if AWS is configured)
let DynamoDBClient: any;
let GetItemCommand: any;
let PutItemCommand: any;

const TABLE_NAME = 'RetroConsoleGlobalMemory';
const PARTITION_KEY = 'userId';

export class DynamoDBMemoryStore implements GlobalMemoryStore {
  private client: any;
  private userId: string;

  constructor(userId: string = 'default-user') {
    console.warn('DynamoDBMemoryStore is deprecated. Use HttpMemoryStore instead for better security.');
    this.userId = userId;
    this.initializeClient();
  }

  private initializeClient(): void {
    // Check if AWS is configured
    if (!process.env.AWS_ACCESS_KEY_ID) {
      throw new Error('AWS not configured - AWS_ACCESS_KEY_ID environment variable is required');
    }

    if (!process.env.AWS_SECRET_ACCESS_KEY) {
      throw new Error('AWS not configured - AWS_SECRET_ACCESS_KEY environment variable is required');
    }

    if (!process.env.AWS_REGION) {
      throw new Error('AWS not configured - AWS_REGION environment variable is required');
    }

    try {
      // Lazy load AWS SDK to avoid bundling if not used
      const AWS = require('@aws-sdk/client-dynamodb');
      DynamoDBClient = AWS.DynamoDBClient;
      GetItemCommand = AWS.GetItemCommand;
      PutItemCommand = AWS.PutItemCommand;

      this.client = new DynamoDBClient({
        region: process.env.AWS_REGION,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      });
    } catch (error) {
      throw new Error(`Failed to initialize AWS DynamoDB client: ${error}`);
    }
  }

  async load(): Promise<GlobalBehaviorData | null> {
    try {
      const command = new GetItemCommand({
        TableName: TABLE_NAME,
        Key: {
          [PARTITION_KEY]: { S: this.userId },
        },
      });

      const response = await this.client.send(command);
      
      if (!response.Item || !response.Item.data) {
        return null;
      }

      // Parse the stored JSON data
      const jsonData = response.Item.data.S;
      return JSON.parse(jsonData) as GlobalBehaviorData;
    } catch (error) {
      console.error('Failed to load from DynamoDB:', error);
      throw error;
    }
  }

  async save(data: GlobalBehaviorData): Promise<void> {
    try {
      const command = new PutItemCommand({
        TableName: TABLE_NAME,
        Item: {
          [PARTITION_KEY]: { S: this.userId },
          data: { S: JSON.stringify(data) },
          updatedAt: { N: Date.now().toString() },
        },
      });

      await this.client.send(command);
    } catch (error) {
      console.error('Failed to save to DynamoDB:', error);
      throw error;
    }
  }
}