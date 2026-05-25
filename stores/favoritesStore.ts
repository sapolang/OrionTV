import { create } from "zustand";
import { Favorite, FavoriteManager } from "@/services/storage";
import { api } from "@/services/api";

export interface FavoriteWithSource extends Favorite {
  key: string;
  isLocal: boolean;
}

interface FavoritesState {
  favorites: FavoriteWithSource[];
  loading: boolean;
  error: string | null;
  fetchFavorites: () => Promise<void>;
}

const useFavoritesStore = create<FavoritesState>((set) => ({
  favorites: [],
  loading: false,
  error: null,
  fetchFavorites: async () => {
    set({ loading: true, error: null });
    try {
      // 首先从本地 SQLite 获取
      const localData: Record<string, Favorite> = {};
      try {
        const localFavorites = await FavoriteManager.getAll();
        Object.assign(localData, localFavorites);
      } catch (localError) {
        console.log("本地获取收藏失败:", localError);
      }

      // 再从服务器获取
      const serverData: Record<string, Favorite> = {};
      try {
        const serverFavorites = await api.getFavorites();
        if (serverFavorites && typeof serverFavorites === 'object') {
          Object.assign(serverData, serverFavorites as Record<string, Favorite>);
        }
      } catch (serverError) {
        console.log("服务器获取收藏失败:", serverError);
      }

      // 合并数据，标记来源
      const allKeys = new Set([...Object.keys(localData), ...Object.keys(serverData)]);
      const favoritesArray: FavoriteWithSource[] = [];

      for (const key of allKeys) {
        const localItem = localData[key];
        const serverItem = serverData[key];

        if (serverItem) {
          // 服务器存在：标记为非本地（即使本地也有，服务器优先）
          favoritesArray.push({ ...serverItem, key, isLocal: false });
        } else if (localItem) {
          // 只有本地有
          favoritesArray.push({ ...localItem, key, isLocal: true });
        }
      }

      set({ favorites: favoritesArray, loading: false });
    } catch (e) {
      const error = e instanceof Error ? e.message : "获取收藏列表失败";
      set({ error, loading: false });
    }
  },
}));

export default useFavoritesStore;
