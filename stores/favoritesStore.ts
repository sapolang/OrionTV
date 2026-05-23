import { create } from "zustand";
import { FavoriteManager } from "@/services/storage";
import { Favorite as APIFavorite } from "@/services/api";
import Logger from "@/utils/Logger";

const logger = Logger.withTag('FavoritesStore');

export type Favorite = APIFavorite;

export interface FavoritesState {
  favorites: Record<string, Favorite>;
  loading: boolean;
  error: string | null;
  loadFavorites: () => Promise<void>;
  toggleFavorite: (source: string, id: string, item: Omit<Favorite, 'save_time'>) => Promise<boolean>;
  removeFavorite: (source: string, id: string) => Promise<void>;
  clearAllFavorites: () => Promise<void>;
  isFavorited: (source: string, id: string) => Promise<boolean>;
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  favorites: {},
  loading: false,
  error: null,

  loadFavorites: async () => {
    try {
      set({ loading: true, error: null });
      logger.info("Loading favorites from storage...");
      const allFavorites = await FavoriteManager.getAll();
      set({ favorites: allFavorites as Record<string, Favorite> });
      logger.info(`Successfully loaded ${Object.keys(allFavorites).length} favorites`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "加载收藏失败";
      logger.error("Failed to load favorites:", error);
      set({ error: errorMessage });
    } finally {
      set({ loading: false });
    }
  },

  toggleFavorite: async (source: string, id: string, item: Omit<Favorite, 'save_time'>) => {
    try {
      logger.info(`Toggling favorite: ${source}-${id}`);
      const result = await FavoriteManager.toggle(source, id, item);
      
      // 更新本地状态
      if (result) {
        // 添加成功
        const allFavorites = await FavoriteManager.getAll();
        set({ favorites: allFavorites as Record<string, Favorite> });
      } else {
        // 移除成功
        const { favorites } = get();
        const key = `${source}+${id}`;
        if (favorites[key]) {
          const newFavorites = { ...favorites };
          delete newFavorites[key];
          set({ favorites: newFavorites });
        }
      }
      
      return result;
    } catch (error) {
      logger.error(`Failed to toggle favorite ${source}-${id}:`, error);
      throw error;
    }
  },

  removeFavorite: async (source: string, id: string) => {
    try {
      logger.info(`Removing favorite: ${source}-${id}`);
      await FavoriteManager.remove(source, id);
      
      // 更新本地状态
      const { favorites } = get();
      const key = `${source}+${id}`;
      if (favorites[key]) {
        const newFavorites = { ...favorites };
        delete newFavorites[key];
        set({ favorites: newFavorites });
      }
    } catch (error) {
      logger.error(`Failed to remove favorite ${source}-${id}:`, error);
      throw error;
    }
  },

  clearAllFavorites: async () => {
    try {
      logger.info("Clearing all favorites...");
      await FavoriteManager.clearAll();
      set({ favorites: {} });
    } catch (error) {
      logger.error("Failed to clear all favorites:", error);
      throw error;
    }
  },

  isFavorited: async (source: string, id: string) => {
    try {
      const result = await FavoriteManager.isFavorited(source, id);
      return result;
    } catch (error) {
      logger.error(`Failed to check favorite status ${source}-${id}:`, error);
      return false;
    }
  },
}));

export default useFavoritesStore;