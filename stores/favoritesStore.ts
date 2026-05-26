import { create } from "zustand";
import { Favorite, FavoriteManager } from "@/services/storage";
import { api } from "@/services/api";
import { FavoriteDb } from "@/services/favoriteDb";
import NetInfo from '@react-native-community/netinfo';

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

// 检查网络连接状态
const isNetworkAvailable = async (): Promise<boolean> => {
  try {
    const netState = await NetInfo.fetch();
    return netState.isConnected ?? false;
  } catch {
    return false;
  }
};

// 超时包装函数
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> => {
  const timeout = new Promise<T>((_, reject) => {
    setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
  });
  return Promise.race([promise, timeout]);
};

const useFavoritesStore = create<FavoritesState>((set, get) => ({
  favorites: [],
  loading: false,
  error: null,
  fetchFavorites: async () => {
    set({ loading: true, error: null });
    
    // 第一步：优先获取并展示本地数据
    let localData: Record<string, Favorite> = {};
    try {
      const localFavorites = await withTimeout(FavoriteDb.getAll(), 5000, "本地数据库操作超时");
      localData = localFavorites;
      
      // 立即展示本地数据
      const localArray = Object.entries(localData).map(([key, item]) => ({
        ...item,
        key,
        isLocal: true,
      }));
      set({ favorites: localArray, loading: false });
    } catch (localError) {
      console.log("本地获取收藏失败:", localError);
      set({ loading: false });
    }

    // 第二步：在后台获取服务器数据（不阻塞 UI）
    if (!api.baseURL) {
      return; // 没有配置服务器地址，直接返回
    }

    try {
      const networkAvailable = await isNetworkAvailable();
      if (!networkAvailable) {
        console.log("网络不可用，跳过服务器请求");
        return;
      }

      // 根据地址类型设置超时时间
      const isLocalNetwork = api.baseURL.includes('192.168.') || 
                            api.baseURL.includes('10.') || 
                            api.baseURL.includes('172.16.') ||
                            api.baseURL.includes('localhost') ||
                            api.baseURL.includes('127.0.0.1');
      const timeoutMs = isLocalNetwork ? 3000 : 10000;

      const serverFavorites = await withTimeout(api.getFavorites(), timeoutMs, isLocalNetwork ? "局域网服务器请求超时" : "服务器请求超时");
      
      if (!serverFavorites || typeof serverFavorites !== 'object') {
        return;
      }

      const serverData = serverFavorites as Record<string, Favorite>;

      // 将服务器数据保存到本地 SQLite（默认不过期）
      for (const [key, item] of Object.entries(serverData)) {
        const { save_time, ...saveItem } = item;
        await FavoriteDb.save(key, saveItem);
      }

      // 合并数据并更新显示（服务器数据优先）
      const currentFavorites = get().favorites;
      const currentKeys = new Set(currentFavorites.map(f => f.key));
      const serverKeys = new Set(Object.keys(serverData));
      const allKeys = new Set([...currentKeys, ...serverKeys]);

      const mergedArray: FavoriteWithSource[] = [];
      for (const key of allKeys) {
        const serverItem = serverData[key];
        if (serverItem) {
          mergedArray.push({ ...serverItem, key, isLocal: false });
        } else {
          const localItem = currentFavorites.find(f => f.key === key);
          if (localItem) {
            mergedArray.push(localItem);
          }
        }
      }

      set({ favorites: mergedArray });
    } catch (serverError) {
      console.log("服务器获取收藏失败（后台）:", serverError);
      // 服务器请求失败不影响本地数据显示
    }
  },
}));

export default useFavoritesStore;
