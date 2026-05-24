import * as SQLite from 'expo-sqlite';
import { SearchResult } from '@/services/api';

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
    CREATE TABLE IF NOT EXISTS detail_cache (
      search_key TEXT PRIMARY KEY,
      data TEXT,
      timestamp INTEGER
    );
  `);
}

interface DetailCacheRow {
  search_key: string;
  data: string;
  timestamp: number;
}

export interface DetailCacheItem {
  searchKey: string;
  results: SearchResult[];
  timestamp: number;
}

export const DetailCacheDb = {
  async save(searchKey: string, results: SearchResult[]): Promise<void> {
    try {
      const database = await getDb();
      await database.runAsync(
        'INSERT OR REPLACE INTO detail_cache (search_key, data, timestamp) VALUES (?, ?, ?)',
        [searchKey, JSON.stringify(results), Date.now()]
      );
    } catch (error) {
      console.warn('Failed to save detail cache:', error);
    }
  },

  async get(searchKey: string): Promise<DetailCacheItem | null> {
    try {
      const database = await getDb();
      const row = await database.getFirstAsync<DetailCacheRow>(
        'SELECT * FROM detail_cache WHERE search_key = ?',
        [searchKey]
      );
      if (!row) return null;
      return {
        searchKey: row.search_key,
        results: JSON.parse(row.data),
        timestamp: row.timestamp,
      };
    } catch (error) {
      console.warn('Failed to get detail cache:', error);
      return null;
    }
  },

  async remove(searchKey: string): Promise<void> {
    try {
      const database = await getDb();
      await database.runAsync('DELETE FROM detail_cache WHERE search_key = ?', [searchKey]);
    } catch (error) {
      console.warn('Failed to remove detail cache:', error);
    }
  },

  async clearAll(): Promise<void> {
    try {
      const database = await getDb();
      await database.runAsync('DELETE FROM detail_cache');
    } catch (error) {
      console.warn('Failed to clear detail cache:', error);
    }
  },
};