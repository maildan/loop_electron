/**
 * SQLite Database Manager
 * Type-safe database operations with auto-migration support
 */

import Database from 'better-sqlite3';
import { join } from 'path';
import { app } from 'electron';
import log from 'electron-log';

export interface TypingLogEntry {
  id?: number;
  timestamp: number;
  keyCount: number;
  sessionId: string;
  appName?: string;
  windowTitle?: string;
  processName?: string;
  duration: number;
  accuracy?: number;
  wpm?: number;
  created_at?: string;
}

export interface TypingStatsEntry {
  id?: number;
  date: string;
  totalKeys: number;
  totalTime: number;
  avgWPM: number;
  accuracy: number;
  sessionCount: number;
  topApp?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserSettings {
  id?: number;
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  created_at?: string;
  updated_at?: string;
}

class SQLiteManager {
  private db: Database.Database | null = null;
  private dbPath: string;
  private isInitialized = false;

  constructor(dbPath?: string) {
    this.dbPath = dbPath || join(app.getPath('userData'), 'loop.db');
  }

  async initialize(): Promise<void> {
    try {
      this.db = new Database(this.dbPath);
      
      // Enable WAL mode for better performance
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('synchronous = NORMAL');
      this.db.pragma('cache_size = 10000');
      this.db.pragma('temp_store = MEMORY');
      
      // Create tables if they don't exist
      await this.createTables();
      
      // Set initialized flag before running migrations
      this.isInitialized = true;
      
      // Run migrations
      await this.runMigrations();
      
      log.info('✅ SQLite 데이터베이스가 성공적으로 초기화되었습니다');
    } catch (error) {
      log.error('❌ SQLite 데이터베이스 초기화 실패:', error);
      this.isInitialized = false;
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Typing logs table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS typing_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        key_count INTEGER NOT NULL,
        session_id TEXT NOT NULL,
        app_name TEXT,
        window_title TEXT,
        process_name TEXT,
        duration INTEGER NOT NULL DEFAULT 0,
        accuracy REAL,
        wpm REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Typing stats summary table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS typing_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL UNIQUE,
        total_keys INTEGER NOT NULL DEFAULT 0,
        total_time INTEGER NOT NULL DEFAULT 0,
        avg_wpm REAL NOT NULL DEFAULT 0,
        accuracy REAL NOT NULL DEFAULT 0,
        session_count INTEGER NOT NULL DEFAULT 0,
        top_app TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // User settings table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'string',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Performance metrics table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS performance_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        cpu_usage REAL,
        memory_usage REAL,
        gpu_usage REAL,
        fps INTEGER,
        event_type TEXT,
        data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for better performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_typing_logs_timestamp ON typing_logs(timestamp);
      CREATE INDEX IF NOT EXISTS idx_typing_logs_session ON typing_logs(session_id);
      CREATE INDEX IF NOT EXISTS idx_typing_stats_date ON typing_stats(date);
      CREATE INDEX IF NOT EXISTS idx_performance_timestamp ON performance_metrics(timestamp);
    `);

    log.info('✅ 데이터베이스 테이블이 성공적으로 생성되었습니다');
  }

  private async runMigrations(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Get current schema version
    let version = 0;
    try {
      const result = this.db.prepare('SELECT value FROM user_settings WHERE key = ?').get('schema_version');
      if (result) {
        version = parseInt((result as any).value, 10);
      }
    } catch (error) {
      // Settings table might not exist yet
    }

    // Migration 1: Add WPM and accuracy columns
    if (version < 1) {
      try {
        this.db.exec(`
          ALTER TABLE typing_logs ADD COLUMN wpm REAL;
          ALTER TABLE typing_logs ADD COLUMN accuracy REAL;
        `);
        this.setSetting('schema_version', '1', 'number');
        version = 1;
        log.info('✅ 마이그레이션 1 완료');
      } catch (error) {
        // Columns might already exist
        log.warn('마이그레이션 1 건너뜀:', error);
      }
    }

    // Migration 2: Add performance metrics table (already handled in createTables)
    if (version < 2) {
      this.setSetting('schema_version', '2', 'number');
      version = 2;
      log.info('✅ 마이그레이션 2 완료');
    }

    log.info(`✅ 데이터베이스 마이그레이션 완료 (버전: ${version})`);
  }

  // Typing logs operations
  async insertTypingLog(entry: Omit<TypingLogEntry, 'id' | 'created_at'>): Promise<number> {
    if (!this.isInitialized || !this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      INSERT INTO typing_logs (timestamp, key_count, session_id, app_name, window_title, process_name, duration, accuracy, wpm)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      entry.timestamp,
      entry.keyCount,
      entry.sessionId,
      entry.appName || null,
      entry.windowTitle || null,
      entry.processName || null,
      entry.duration,
      entry.accuracy || null,
      entry.wpm || null
    );

    return result.lastInsertRowid as number;
  }

  async getTypingLogs(limit = 100, offset = 0): Promise<TypingLogEntry[]> {
    if (!this.isInitialized || !this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      SELECT id, timestamp, key_count as keyCount, session_id as sessionId, 
             app_name as appName, window_title as windowTitle, process_name as processName,
             duration, accuracy, wpm, created_at
      FROM typing_logs 
      ORDER BY timestamp DESC 
      LIMIT ? OFFSET ?
    `);

    return stmt.all(limit, offset) as TypingLogEntry[];
  }

  async getTypingLogsByDateRange(startDate: number, endDate: number): Promise<TypingLogEntry[]> {
    if (!this.isInitialized || !this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      SELECT id, timestamp, key_count as keyCount, session_id as sessionId,
             app_name as appName, window_title as windowTitle, process_name as processName,
             duration, accuracy, wpm, created_at
      FROM typing_logs 
      WHERE timestamp BETWEEN ? AND ?
      ORDER BY timestamp ASC
    `);

    return stmt.all(startDate, endDate) as TypingLogEntry[];
  }

  // Typing stats operations
  async upsertTypingStats(stats: Omit<TypingStatsEntry, 'id' | 'created_at' | 'updated_at'>): Promise<void> {
    if (!this.isInitialized || !this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      INSERT INTO typing_stats (date, total_keys, total_time, avg_wpm, accuracy, session_count, top_app)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(date) DO UPDATE SET
        total_keys = excluded.total_keys,
        total_time = excluded.total_time,
        avg_wpm = excluded.avg_wpm,
        accuracy = excluded.accuracy,
        session_count = excluded.session_count,
        top_app = excluded.top_app,
        updated_at = CURRENT_TIMESTAMP
    `);

    stmt.run(
      stats.date,
      stats.totalKeys,
      stats.totalTime,
      stats.avgWPM,
      stats.accuracy,
      stats.sessionCount,
      stats.topApp || null
    );
  }

  async getTypingStats(days = 30): Promise<TypingStatsEntry[]> {
    if (!this.isInitialized || !this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      SELECT id, date, total_keys as totalKeys, total_time as totalTime,
             avg_wpm as avgWPM, accuracy, session_count as sessionCount,
             top_app as topApp, created_at, updated_at
      FROM typing_stats 
      ORDER BY date DESC 
      LIMIT ?
    `);

    return stmt.all(days) as TypingStatsEntry[];
  }

  // Settings operations
  setSetting(key: string, value: string, type: UserSettings['type'] = 'string'): void {
    if (!this.isInitialized || !this.db) throw new Error('데이터베이스가 초기화되지 않았습니다');

    const stmt = this.db.prepare(`
      INSERT INTO user_settings (key, value, type)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        type = excluded.type,
        updated_at = CURRENT_TIMESTAMP
    `);

    stmt.run(key, value, type);
  }

  // Async version for compatibility
  async setSettingAsync(key: string, value: string, type: UserSettings['type'] = 'string'): Promise<void> {
    this.setSetting(key, value, type);
  }

  async getSetting(key: string): Promise<any> {
    if (!this.isInitialized || !this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('SELECT value, type FROM user_settings WHERE key = ?');
    const result = stmt.get(key) as { value: string; type: UserSettings['type'] } | undefined;

    if (!result) return null;

    // Parse value based on type
    switch (result.type) {
      case 'number':
        return parseFloat(result.value);
      case 'boolean':
        return result.value === 'true';
      case 'json':
        return JSON.parse(result.value);
      default:
        return result.value;
    }
  }

  async getAllSettings(): Promise<Record<string, any>> {
    if (!this.isInitialized || !this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('SELECT key, value, type FROM user_settings');
    const results = stmt.all() as Array<{ key: string; value: string; type: UserSettings['type'] }>;

    const settings: Record<string, any> = {};
    for (const { key, value, type } of results) {
      switch (type) {
        case 'number':
          settings[key] = parseFloat(value);
          break;
        case 'boolean':
          settings[key] = value === 'true';
          break;
        case 'json':
          settings[key] = JSON.parse(value);
          break;
        default:
          settings[key] = value;
      }
    }

    return settings;
  }

  // Performance metrics
  async insertPerformanceMetric(data: {
    timestamp: number;
    cpuUsage?: number;
    memoryUsage?: number;
    gpuUsage?: number;
    fps?: number;
    eventType?: string;
    data?: any;
  }): Promise<void> {
    if (!this.isInitialized || !this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      INSERT INTO performance_metrics (timestamp, cpu_usage, memory_usage, gpu_usage, fps, event_type, data)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      data.timestamp,
      data.cpuUsage || null,
      data.memoryUsage || null,
      data.gpuUsage || null,
      data.fps || null,
      data.eventType || null,
      data.data ? JSON.stringify(data.data) : null
    );
  }

  // Cleanup operations
  async cleanup(daysToKeep = 30): Promise<void> {
    if (!this.isInitialized || !this.db) throw new Error('Database not initialized');

    const cutoffTimestamp = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);

    // Clean old typing logs
    const cleanupLogs = this.db.prepare('DELETE FROM typing_logs WHERE timestamp < ?');
    const logsDeleted = cleanupLogs.run(cutoffTimestamp);

    // Clean old performance metrics
    const cleanupMetrics = this.db.prepare('DELETE FROM performance_metrics WHERE timestamp < ?');
    const metricsDeleted = cleanupMetrics.run(cutoffTimestamp);

    // Vacuum to reclaim space
    this.db.exec('VACUUM');

    log.info(`✅ Cleanup completed: ${logsDeleted.changes} logs, ${metricsDeleted.changes} metrics deleted`);
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.isInitialized = false;
      log.info('✅ SQLite database closed');
    }
  }

  // Execute raw query (for advanced use cases)
  async executeQuery(query: string, params: any[] = []): Promise<any> {
    if (!this.isInitialized || !this.db) throw new Error('Database not initialized');

    try {
      if (query.trim().toUpperCase().startsWith('SELECT')) {
        const stmt = this.db.prepare(query);
        return stmt.all(...params);
      } else {
        const stmt = this.db.prepare(query);
        return stmt.run(...params);
      }
    } catch (error) {
      log.error('Database query error:', error);
      throw error;
    }
  }
}

// Export singleton instance
const sqliteManager = new SQLiteManager();

export { sqliteManager, SQLiteManager };

// Initialize function for main process
export async function initializeDatabase(dbPath?: string): Promise<void> {
  const manager = dbPath ? new SQLiteManager(dbPath) : sqliteManager;
  await manager.initialize();
}
