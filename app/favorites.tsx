import React, { useEffect, useState } from "react";
import { View, FlatList, StyleSheet, Image, ActivityIndicator } from "react-native";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { getCommonResponsiveStyles } from "@/utils/ResponsiveStyles";
import ResponsiveNavigation from "@/components/navigation/ResponsiveNavigation";
import ResponsiveHeader from "@/components/navigation/ResponsiveHeader";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { StyledButton } from "@/components/StyledButton";
import { FavoriteManager } from "@/services/storage";
import Logger from "@/utils/Logger";
import { useRouter } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";

const logger = Logger.withTag('FavoritesScreen');

export default function FavoritesScreen() {
  const router = useRouter();
  const responsiveConfig = useResponsiveLayout();
  const commonStyles = getCommonResponsiveStyles(responsiveConfig);
  const { deviceType, spacing } = responsiveConfig;
  
  const [favorites, setFavorites] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFavorites = async () => {
    try {
      setLoading(true);
      logger.info("Loading favorites...");
      const allFavorites = await FavoriteManager.getAll();
      setFavorites(allFavorites);
      logger.info(`Loaded ${Object.keys(allFavorites).length} favorites`);
      setError(null);
    } catch (error) {
      logger.error("Failed to load favorites:", error);
      setError("加载收藏列表失败，请检查网络连接");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  const handleFavoritePress = async (source: string, id: string, searchTitle: string) => {
    try {
      router.push({
        pathname: '/detail',
        params: { 
          q: searchTitle,
          preferredSource: source,
          id: id
        }
      });
    } catch (error) {
      logger.error("Failed to navigate to detail:", error);
    }
  };

  const handleRemoveFavorite = async (source: string, id: string) => {
    try {
      await FavoriteManager.remove(source, id);
      // 更新本地状态
      setFavorites(prev => {
        const newFavorites = { ...prev };
        const key = `${source}+${id}`;
        delete newFavorites[key];
        return newFavorites;
      });
    } catch (error) {
      logger.error("Failed to remove favorite:", error);
    }
  };

  const renderFavoriteItem = ({ item }: { item: any }) => {
    const { key, data } = item;
    const [source, id] = key.split("+");
    
    return (
      <StyledButton
        style={dynamicStyles.favoriteItem}
        onPress={() => handleFavoritePress(source, id, data.search_title || data.title)}
        hasTVPreferredFocus
      >
        <Image 
          source={{ uri: data.poster || data.cover }} 
          style={dynamicStyles.favoriteImage}
          resizeMode="cover"
        />
        <View style={dynamicStyles.favoriteInfo}>
          <ThemedText style={dynamicStyles.favoriteTitle} numberOfLines={2}>
            {data.title}
          </ThemedText>
          {data.year && (
            <ThemedText style={dynamicStyles.favoriteYear}>{data.year}</ThemedText>
          )}
          {data.source_name && (
            <ThemedText style={dynamicStyles.favoriteSource}>{data.source_name}</ThemedText>
          )}
          {data.total_episodes && data.total_episodes > 1 && (
            <ThemedText style={dynamicStyles.favoriteEpisodes}>
              {data.total_episodes} 集
            </ThemedText>
          )}
        </View>
        <StyledButton
          variant="ghost"
          style={dynamicStyles.removeButton}
          onPress={(e) => {
            e.stopPropagation();
            handleRemoveFavorite(source, id);
          }}
        >
          <FontAwesome name="trash-o" size={20} color="#ccc" />
        </StyledButton>
      </StyledButton>
    );
  };

  const renderEmptyState = () => {
    if (loading) return null;
    
    return (
      <View style={dynamicStyles.emptyContainer}>
        <FontAwesome name="heart-o" size={60} color="#666" />
        <ThemedText style={dynamicStyles.emptyText}>暂无收藏内容</ThemedText>
        <ThemedText style={dynamicStyles.emptySubtext}>
          快去添加您喜欢的影视内容吧
        </ThemedText>
      </View>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={dynamicStyles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <ThemedText style={dynamicStyles.loadingText}>加载中...</ThemedText>
        </View>
      );
    }

    if (error) {
      return (
        <View style={dynamicStyles.errorContainer}>
          <FontAwesome name="exclamation-triangle" size={40} color="#ff9800" />
          <ThemedText style={dynamicStyles.errorText}>{error}</ThemedText>
          <StyledButton
            text="重新加载"
            onPress={loadFavorites}
            variant="primary"
            style={dynamicStyles.reloadButton}
          />
        </View>
      );
    }

    const favoriteItems = Object.entries(favorites).map(([key, data]) => ({
      key,
      data
    }));

    if (favoriteItems.length === 0) {
      return renderEmptyState();
    }

    return (
      <FlatList
        data={favoriteItems}
        renderItem={renderFavoriteItem}
        keyExtractor={(item) => item.key}
        contentContainerStyle={dynamicStyles.listContent}
        showsVerticalScrollIndicator={false}
        numColumns={deviceType === 'mobile' ? 2 : 3}
      />
    );
  };

  const dynamicStyles = StyleSheet.create({
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: spacing,
    },
    loadingText: {
      marginTop: spacing,
      fontSize: 16,
      color: '#999',
    },
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: spacing,
    },
    errorText: {
      marginTop: spacing,
      fontSize: 16,
      color: '#ff9800',
      textAlign: 'center',
    },
    reloadButton: {
      marginTop: spacing * 2,
      width: '60%',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: spacing,
    },
    emptyText: {
      marginTop: spacing,
      fontSize: 20,
      color: '#666',
      fontWeight: 'bold',
    },
    emptySubtext: {
      marginTop: spacing / 2,
      fontSize: 14,
      color: '#999',
    },
    listContent: {
      padding: spacing,
      gap: spacing,
    },
    favoriteItem: {
      flex: 1,
      backgroundColor: '#1a1a1a',
      borderRadius: 8,
      overflow: 'hidden',
      flexDirection: 'column',
      minHeight: deviceType === 'mobile' ? 200 : 250,
    },
    favoriteImage: {
      width: '100%',
      height: deviceType === 'mobile' ? 120 : 160,
      backgroundColor: '#333',
    },
    favoriteInfo: {
      flex: 1,
      padding: spacing / 2,
      justifyContent: 'space-between',
    },
    favoriteTitle: {
      fontSize: deviceType === 'mobile' ? 14 : 16,
      fontWeight: 'bold',
      color: 'white',
      marginBottom: spacing / 4,
    },
    favoriteYear: {
      fontSize: 12,
      color: '#999',
    },
    favoriteSource: {
      fontSize: 12,
      color: '#666',
    },
    favoriteEpisodes: {
      fontSize: 12,
      color: '#feff5f',
      marginTop: spacing / 4,
    },
    removeButton: {
      position: 'absolute',
      top: spacing / 2,
      right: spacing / 2,
      backgroundColor: 'rgba(0,0,0,0.7)',
      borderRadius: 20,
      padding: 4,
    },
  });

  if (deviceType === "tv") {
    return (
      <ThemedView style={commonStyles.container}>
        <ResponsiveHeader title="我的收藏" showBackButton />
        {renderContent()}
      </ThemedView>
    );
  }

  return (
    <ResponsiveNavigation>
      <ResponsiveHeader title="我的收藏" showBackButton />
      <ThemedView style={commonStyles.container}>
        {renderContent()}
      </ThemedView>
    </ResponsiveNavigation>
  );
}