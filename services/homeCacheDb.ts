import * as SQLite from 'expo-sqlite';
import { RowItem } from '@/stores/homeStore';

const DB_NAME = 'oriontv.db';

let db: SQLite.SQLiteDatabase | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync(DB_NAME);
    await initDb();
  }
  return db;
}

async function initDb(): Promise<void> {
  if (!db) return;
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS home_cache (
      cache_key TEXT PRIMARY KEY,
      data TEXT,
      timestamp INTEGER,
      type TEXT,
      has_more INTEGER
    );
  `);
}

interface HomeCacheRow {
  cache_key: string;
  data: string;
  timestamp: number;
  type: string;
  has_more: number;
}

export interface HomeCacheItem {
  data: RowItem[];
  timestamp: number;
  type: 'movie' | 'tv' | 'record';
  hasMore: boolean;
}

export const HomeCacheDb = {
  async save(cacheKey: string, item: HomeCacheItem): Promise<void> {
    try {
      const database = await getDb();
      await database.runAsync(
        'INSERT OR REPLACE INTO home_cache (cache_key, data, timestamp, type, has_more) VALUES (?, ?, ?, ?, ?)',
        [cacheKey, JSON.stringify(item.data), item.timestamp, item.type, item.hasMore ? 1 : 0]
      );
    } catch (error) {
      console.warn('Failed to save home cache:', error);
    }
  },

  async get(cacheKey: string): Promise<HomeCacheItem | null> {
    const database = await getDb();
    const row = await database.getFirstAsync<HomeCacheRow>(
      'SELECT * FROM home_cache WHERE cache_key = ?',
      [cacheKey]
    );
    if (!row) return null;
    return {
      data: JSON.parse(row.data),
      timestamp: row.timestamp,
      type: row.type as 'movie' | 'tv' | 'record',
      hasMore: row.has_more === 1,
    };
  },

  async remove(cacheKey: string): Promise<void> {
    const database = await getDb();
    await database.runAsync('DELETE FROM home_cache WHERE cache_key = ?', [cacheKey]);
  },

  async clearAll(): Promise<void> {
    const database = await getDb();
    await database.runAsync('DELETE FROM home_cache');
  },

  async clearExpired(maxAge: number): Promise<void> {
    const database = await getDb();
    const cutoffTime = Date.now() - maxAge;
    await database.runAsync('DELETE FROM home_cache WHERE timestamp < ?', [cutoffTime]);
  },
};