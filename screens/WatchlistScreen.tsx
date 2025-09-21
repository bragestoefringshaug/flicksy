import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import { useAuth } from '../contexts/AuthContext';
import { Movie, movieApi } from '../services/movieApi';

interface WatchlistItem extends Movie {
  isMovie: boolean;
  name?: string;
  first_air_date?: string;
}

export default function WatchlistScreen() {
  const { user, updatePreferences } = useAuth();
  const [watchlistItems, setWatchlistItems] = useState<WatchlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadWatchlist();
  }, [user]);

  const loadWatchlist = async () => {
    if (!user || user.preferences.watchlist.length === 0) {
      setWatchlistItems([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const items: WatchlistItem[] = [];

      // Load details for each item in watchlist
      for (const itemId of user.preferences.watchlist) {
        try {
          // Try to get as movie first
          const movie = await movieApi.getMovieDetails(itemId);
          items.push({ ...movie, isMovie: true });
        } catch {
          try {
            // If not a movie, try as TV show
            const tvShow = await movieApi.getTVShowDetails(itemId);
            items.push({ ...tvShow, isMovie: false });
          } catch (error) {
            console.warn(`Could not load details for item ${itemId}:`, error);
          }
        }
      }

      setWatchlistItems(items);
    } catch (error) {
      console.error('Error loading watchlist:', error);
      Alert.alert('Error', 'Failed to load watchlist');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadWatchlist();
    setIsRefreshing(false);
  };

  const removeFromWatchlist = async (itemId: number) => {
    if (!user) return;

    Alert.alert(
      'Remove from Watchlist',
      'Are you sure you want to remove this item from your watchlist?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const updatedWatchlist = user.preferences.watchlist.filter(id => id !== itemId);
            await updatePreferences({ watchlist: updatedWatchlist });
            setWatchlistItems(prev => prev.filter(item => item.id !== itemId));
          },
        },
      ]
    );
  };

  const renderWatchlistItem = ({ item }: { item: WatchlistItem }) => {
    const title = item.isMovie ? item.title : (item.name || 'Unknown');
    const releaseDate = item.isMovie ? item.release_date : (item.first_air_date || '');
    const year = releaseDate ? new Date(releaseDate).getFullYear() : 'N/A';
    const posterUrl = movieApi.getImageUrl(item.poster_path, 'w185');

    return (
      <View style={styles.itemContainer}>
        <Image
          source={{ uri: posterUrl }}
          style={styles.poster}
          resizeMode="cover"
        />
        
        <View style={styles.itemContent}>
          <View style={styles.itemHeader}>
            <ThemedText style={styles.itemTitle} numberOfLines={2}>
              {title}
            </ThemedText>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removeFromWatchlist(item.id)}
            >
              <Ionicons name="close-circle" size={24} color="#F44336" />
            </TouchableOpacity>
          </View>

          <View style={styles.itemDetails}>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={14} color="#FFD700" />
              <Text style={styles.rating}>{item.vote_average.toFixed(1)}</Text>
              <Text style={styles.year}>({year})</Text>
            </View>

            <View style={styles.typeContainer}>
              <View style={[styles.typeBadge, { backgroundColor: item.isMovie ? '#007AFF' : '#34C759' }]}>
                <Text style={styles.typeText}>
                  {item.isMovie ? 'Movie' : 'TV Show'}
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.overview} numberOfLines={3}>
            {item.overview}
          </Text>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="bookmark-outline" size={64} color="#999" />
      <ThemedText style={styles.emptyTitle}>Your watchlist is empty</ThemedText>
      <ThemedText style={styles.emptySubtitle}>
        Start swiping to add movies and TV shows you want to watch!
      </ThemedText>
    </View>
  );

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <ThemedText style={styles.loadingText}>Loading your watchlist...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>My Watchlist</ThemedText>
        <ThemedText style={styles.headerSubtitle}>
          {watchlistItems.length} {watchlistItems.length === 1 ? 'item' : 'items'}
        </ThemedText>
      </View>

      <FlatList
        data={watchlistItems}
        renderItem={renderWatchlistItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#007AFF"
          />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  itemContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  poster: {
    width: 80,
    height: 120,
    backgroundColor: '#f0f0f0',
  },
  itemContent: {
    flex: 1,
    padding: 16,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
  },
  removeButton: {
    padding: 4,
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
    color: '#333',
  },
  year: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  typeContainer: {
    flexDirection: 'row',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  overview: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
});
