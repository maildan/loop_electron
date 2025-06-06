/**
 * MongoDB Synchronization Manager
 * Handles syncing data between SQLite and MongoDB
 */

import { MongoClient, Db, Collection } from 'mongodb';
import log from 'electron-log';
import { SQLiteManager, TypingLogEntry, TypingStatsEntry } from './sqlite-manager';

export interface MongoDBConfig {
  uri: string;
  database: string;
  collections: {
    typingLogs: string;
    typingStats: string;
    userSettings: string;
  };
}

export interface SyncStatus {
  isConnected: boolean;
  isOnline: boolean;
  lastSync: Date | null;
  pendingChanges: number;
  syncErrors: string[];
}

export class MongoDBSyncManager {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private config: MongoDBConfig;
  private sqliteManager: SQLiteManager;
  private isConnected = false;
  private isOnline = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private syncQueue = new Map<string, any[]>();
  private lastSyncTime: Date | null = null;

  constructor(sqliteManager: SQLiteManager, config?: Partial<MongoDBConfig>) {
    this.sqliteManager = sqliteManager;
    this.config = {
      uri: config?.uri || process.env.MONGODB_URI || 'mongodb://localhost:27017',
      database: config?.database || 'loop_typing',
      collections: {
        typingLogs: 'typing_logs',
        typingStats: 'typing_stats',
        userSettings: 'user_settings',
        ...config?.collections
      }
    };

    // Initialize sync queues
    this.syncQueue.set('typingLogs', []);
    this.syncQueue.set('typingStats', []);
    this.syncQueue.set('userSettings', []);
  }

  async initialize(): Promise<void> {
    try {
      await this.connect();
      log.info('✅ MongoDB sync manager initialized successfully');
    } catch (error) {
      log.error('❌ MongoDB sync manager initialization failed:', error);
      // Don't throw error - app should work without MongoDB
      this.isConnected = false;
    }
  }

  async connect(): Promise<void> {
    try {
      this.client = new MongoClient(this.config.uri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 0,
      });

      await this.client.connect();
      this.db = this.client.db(this.config.database);
      this.isConnected = true;
      this.isOnline = true;

      log.info('✅ Connected to MongoDB successfully');

      // Start sync interval
      this.startSyncInterval();
    } catch (error) {
      log.error('❌ Failed to connect to MongoDB:', error);
      this.isConnected = false;
      this.isOnline = false;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      this.isConnected = false;
      this.isOnline = false;
      log.info('✅ Disconnected from MongoDB');
    }
  }

  async cleanup(): Promise<void> {
    await this.disconnect();
  }

  // Queue local changes for sync
  queueLocalChange(collectionType: string, data: any): void {
    const queue = this.syncQueue.get(collectionType) || [];
    queue.push(data);
    this.syncQueue.set(collectionType, queue);

    // Try to sync immediately if online
    if (this.isOnline && this.isConnected) {
      this.processPendingSync().catch(error => {
        log.error('Failed to process pending sync:', error);
      });
    }
  }

  private startSyncInterval(): void {
    this.syncInterval = setInterval(async () => {
      try {
        await this.syncLocalToRemote();
        await this.pullRemoteData();
      } catch (error) {
        log.error('Scheduled sync failed:', error);
      }
    }, 30000) as NodeJS.Timeout; // Sync every 30 seconds
  }

  private async processPendingSync(): Promise<void> {
    if (!this.isConnected || !this.db) {
      log.warn('Cannot sync to remote: not connected');
      return;
    }

    try {
      for (const [collectionType, changes] of this.syncQueue) {
        if (changes.length > 0) {
          await this.syncQueuedChanges(collectionType, changes);
          this.syncQueue.set(collectionType, []);
        }
      }
    } catch (error) {
      log.error('Failed to process pending sync:', error);
    }
  }

  private async syncQueuedChanges(collectionType: string, changes: any[]): Promise<void> {
    if (!this.db) return;

    const collection = this.db.collection(this.getCollectionName(collectionType));
    
    for (const change of changes) {
      try {
        await collection.replaceOne(
          { _id: change.id } as any,
          { ...change, _id: change.id },
          { upsert: true }
        );
      } catch (error) {
        log.error(`Failed to sync ${collectionType} change:`, error);
      }
    }
  }

  private getCollectionName(collectionType: string): string {
    switch (collectionType) {
      case 'typingLogs':
        return this.config.collections.typingLogs;
      case 'typingStats':
        return this.config.collections.typingStats;
      case 'userSettings':
        return this.config.collections.userSettings;
      default:
        return collectionType;
    }
  }

  async getSyncStatus(): Promise<SyncStatus> {
    const pendingChanges = Array.from(this.syncQueue.values())
      .reduce((total, queue) => total + queue.length, 0);

    return {
      isConnected: this.isConnected,
      isOnline: this.isOnline,
      lastSync: this.lastSyncTime,
      pendingChanges,
      syncErrors: [], // This should be tracked separately
    };
  }

  async updateConfig(newConfig: Partial<MongoDBConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    
    // Reconnect with new config
    await this.disconnect();
    await this.connect();
  }

  async performFullSync(): Promise<void> {
    if (!this.isConnected || !this.db) {
      throw new Error('Cannot perform full sync: not connected to MongoDB');
    }

    try {
      // First, sync local to remote (push all local data)
      await this.syncLocalToRemote();
      
      // Then, sync remote to local (pull any missing data)
      await this.pullRemoteData();
      
      this.lastSyncTime = new Date();
      log.info('Full synchronization completed successfully');
    } catch (error) {
      log.error('Full sync failed:', error);
      throw error;
    }
  }

  private async syncLocalToRemote(): Promise<void> {
    if (!this.isConnected || !this.db) return;

    try {
      // Sync typing logs
      const typingLogs = await this.sqliteManager.getTypingLogs(1000);
      const logsCollection = this.db.collection(this.config.collections.typingLogs);
      
      for (const log of typingLogs) {
        await logsCollection.replaceOne(
          { _id: log.id?.toString() } as any,
          { ...log, _id: log.id?.toString() },
          { upsert: true }
        );
      }

      // Sync typing stats
      const typingStats = await this.sqliteManager.getTypingStats(365);
      const statsCollection = this.db.collection(this.config.collections.typingStats);
      
      for (const stats of typingStats) {
        await statsCollection.replaceOne(
          { _id: stats.id?.toString() } as any,
          { ...stats, _id: stats.id?.toString() },
          { upsert: true }
        );
      }

      // Sync user settings
      const userSettings = await this.sqliteManager.getAllSettings();
      const settingsCollection = this.db.collection(this.config.collections.userSettings);
      
      await settingsCollection.replaceOne(
        { _id: 'user_settings' } as any,
        { _id: 'user_settings', settings: userSettings },
        { upsert: true }
      );

      log.info('✅ Local to remote sync completed');
    } catch (error) {
      log.error('❌ Local to remote sync failed:', error);
    }
  }

  private async pullRemoteData(): Promise<void> {
    if (!this.isConnected || !this.db) return;

    try {
      // Pull typing logs
      const typingLogsCollection = this.db.collection(this.config.collections.typingLogs);
      const remoteLogs = await typingLogsCollection.find({}).toArray();
      
      for (const log of remoteLogs) {
        await this.sqliteManager.insertTypingLog({
          sessionId: log.sessionId,
          timestamp: log.timestamp,
          keyCount: log.keyCount || 0,
          duration: log.duration || 0,
          appName: log.appName,
          windowTitle: log.windowTitle,
          processName: log.processName,
          wpm: log.wpm,
          accuracy: log.accuracy
        });
      }

      // Pull typing stats
      const typingStatsCollection = this.db.collection(this.config.collections.typingStats);
      const remoteStats = await typingStatsCollection.find({}).toArray();
      
      for (const stats of remoteStats) {
        await this.sqliteManager.upsertTypingStats({
          date: stats.date,
          totalKeys: stats.totalKeys || 0,
          totalTime: stats.totalTime || 0,
          avgWPM: stats.avgWPM || 0,
          accuracy: stats.accuracy || 0,
          sessionCount: stats.sessionCount || 0,
          topApp: stats.topApp
        });
      }

      // Pull user settings
      const userSettingsCollection = this.db.collection(this.config.collections.userSettings);
      const remoteSettings = await userSettingsCollection.findOne({ _id: 'user_settings' } as any);
      
      if (remoteSettings && remoteSettings.settings) {
        for (const [key, value] of Object.entries(remoteSettings.settings)) {
          await this.sqliteManager.setSetting(key, String(value), 'string');
        }
      }

      log.info('✅ Remote to local sync completed');
    } catch (error) {
      log.error('❌ Remote to local sync failed:', error);
    }
  }
}

export default MongoDBSyncManager;
