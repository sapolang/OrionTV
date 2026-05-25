import * as SQLite from 'expo-sqlite';
import { Favorite } from './api';

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
    CREATE TABLE IF NOT EXISTS favorites (
      key TEXT PRIMARY KEY,
      cover TEXT,
      title TEXT,
      source_name TEXT,
      total_episodes INTEGER,
      search_title TEXT,
      year TEXT,
      save_time INTEGER
    );
  `);
}

interface FavoriteRow {
  key: string;
  cover: string;
  title: string;
  source_name: string;
  total_episodes: number;
  search_title: string;
  year: string;
  save_time: number;
}

export const FavoriteDb = {
  async getAll(): Promise<Record<string, Favorite>> {
    const database = await getDb();
    const rows = await database.getAllAsync<FavoriteRow>('SELECT * FROM favorites');
    const result: Record<string, Favorite> = {};
    for (const row of rows) {
      result[row.key] = {
        cover: row.cover,
        title: row.title,
        source_name: row.source_name,
        total_episodes: row.total_episodes,
        search_title: row.search_title,
        year: row.year,
        save_time: row.save_time,
      };
    }
    return result;
  },

  async save(key: string, item: Omit<Favorite, 'save_time'>): Promise<void> {
    const database = await getDb();
    const saveTime = Date.now();
    await database.runAsync(
      'INSERT OR REPLACE INTO favorites (key, cover, title, source_name, total_episodes, search_title, year, save_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [key, item.cover, item.title, item.source_name, item.total_episodes, item.search_title, item.year, saveTime]
    );
  },

  async remove(key: string): Promise<void> {
    const database = await getDb();
    await database.runAsync('DELETE FROM favorites WHERE key = ?', [key]);
  },

  async clearAll(): Promise<void> {
    const database = await getDb();
    await database.runAsync('DELETE FROM favorites');
  },

  async isFavorited(key: string): Promise<boolean> {
    const database = await getDb();
    const result = await database.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM favorites WHERE key = ?', [key]);
    return (result?.count ?? 0) > 0;
  },
};
