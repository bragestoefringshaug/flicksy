import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  Modal,
  PanResponder,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import { ALL_GENRES } from '../constants/Genres';
import { useAuth } from '../contexts/AuthContext';
import { MovieMetadata } from '../services/firebaseDb';
import { Movie, movieApi } from '../services/movieApi';

interface WatchlistItem {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  isMovie: boolean;
  genreNames: string[];
}

interface WatchlistRowProps {
  item: WatchlistItem;
  onMarkSeen: (id: number) => void;
  onDelete: (id: number) => void;
}

const WatchlistRow: React.FC<WatchlistRowProps> = ({ item, onMarkSeen, onDelete }) => {
  const title = item.isMovie ? item.title : (item.name || 'Unknown');
  const releaseDate = item.isMovie ? item.release_date : (item.first_air_date || '');
  const year = releaseDate ? new Date(releaseDate).getFullYear() : 'N/A';
  const posterUrl = movieApi.getImageUrl(item.poster_path, 'w185');
  
  // Static reveal text; swipe action handles marking as seen

  const translateX = React.useRef(new Animated.Value(0)).current;
  const [eyeFilled, setEyeFilled] = React.useState(false);
  const [revealLabel, setRevealLabel] = React.useState<'Not Seen' | 'Seen'>('Not Seen');
  const seenTextOpacity = translateX.interpolate({
    inputRange: [-160, -80, 0],
    outputRange: [1, 0.4, 0],
    extrapolate: 'clamp',
  });

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dx < 0) {
          translateX.setValue(gesture.dx);
        }
      },
      onPanResponderRelease: async (_, gesture) => {
        const threshold = -160;
        if (gesture.dx < threshold) {
          onMarkSeen(item.id);
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: false }).start();
        }
      },
    })
  ).current;

  const handleNudgeSeen = () => {
    Animated.spring(translateX, { toValue: -120, useNativeDriver: false }).start(() => {
      Animated.spring(translateX, { toValue: 0, useNativeDriver: false }).start();
    });
  };

  return (
    <View style={styles.swipeContainer}>
      <View style={styles.revealRight}>
        <Animated.Text style={[styles.revealText, { opacity: seenTextOpacity }]}>{revealLabel}</Animated.Text>
      </View>
      <Animated.View style={[styles.itemContainer, { transform: [{ translateX }] }]} {...panResponder.panHandlers}>
      <Image
        source={{ uri: posterUrl }}
        style={styles.poster}
        resizeMode="cover"
      />
      
      <View style={styles.itemContent}>
        <View style={styles.itemHeader}>
          <ThemedText
            style={[styles.itemTitle, item.isMovie ? styles.movieTitle : styles.tvTitle]}
            numberOfLines={2}
          >
            {title}
          </ThemedText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => {
                // Keep original functionality (nudge only)
                handleNudgeSeen();
                // Toggle icon fill and label
                setEyeFilled(prev => !prev);
                setRevealLabel(prev => (prev === 'Seen' ? 'Not Seen' : 'Seen'));
              }}
            >
              <Ionicons name={eyeFilled ? 'eye' : 'eye-outline'} size={24} color="#3A5683" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => onDelete(item.id)}
            >
              <Ionicons name="close-circle-outline" size={24} color="#F44336" />
            </TouchableOpacity>
          </View>
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

        {/* Removed in-card Seen badge; only reveal text behind card remains */}

        <Text style={styles.overview} numberOfLines={3}>
          {item.overview}
        </Text>
      </View>
      </Animated.View>
    </View>
  );
};

export default function WatchlistScreen() {
  const { user, updatePreferences, recordMovieInteraction } = useAuth();
  const [watchlistItems, setWatchlistItems] = useState<WatchlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [seenFilter, setSeenFilter] = useState<'all' | 'seen' | 'unseen'>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState<'Genres' | 'Seen'>('Genres');

  /**
   * Extract movie metadata for ML purposes
   */
  const extractMovieMetadata = (item: WatchlistItem): MovieMetadata => {
    const releaseDate = item.isMovie ? item.release_date : item.first_air_date;
    const releaseYear = releaseDate ? new Date(releaseDate).getFullYear() : 0;
    
    return {
      title: item.isMovie ? item.title : (item.name || 'Unknown'),
      genres: item.genre_ids || [],
      releaseYear,
      popularity: item.popularity || 0,
      isMovie: item.isMovie
    };
  };

  useEffect(() => {
    loadWatchlist();
  }, [user]);

  const loadWatchlist = async () => {
    if (!user || !user.preferences || user.preferences.watchlist?.length === 0) {
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
          const genreNames = await movieApi.mapGenreIdsToNames(movie.genre_ids ?? []);
          items.push({ ...movie, isMovie: true, genreNames });
        } catch {
          try {
            // If not a movie, try as TV show
            const tvShow = await movieApi.getTVShowDetails(itemId);
            const genreNames = await movieApi.mapGenreIdsToNames(tvShow.genre_ids ?? []);
            items.push({ ...tvShow, isMovie: false, genreNames });
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
            const updatedWatchlist = (user.preferences?.watchlist || []).filter(id => id !== itemId);
            await updatePreferences({ watchlist: updatedWatchlist });
            setWatchlistItems(prev => prev.filter(item => item.id !== itemId));
          },
        },
      ]
    );
  };

  const removeFromWatchlistImmediate = async (itemId: number) => {
    if (!user) return;
    try {
      const updatedWatchlist = (user.preferences?.watchlist || []).filter(id => id !== itemId);
      await updatePreferences({ watchlist: updatedWatchlist });
      setWatchlistItems(prev => prev.filter(item => item.id !== itemId));
    } catch (e) {
      console.error('Failed to remove from watchlist', e);
    }
  };

  const markItemAsSeen = async (itemId: number) => {
    if (!user) return;
    try {
      const seen = new Set(user.preferences?.seen ?? []);
      seen.add(itemId);
      await updatePreferences({ seen: Array.from(seen) });
      
      // Record interaction for ML
      const item = watchlistItems.find(i => i.id === itemId);
      if (item) {
        try {
          const movieMetadata = extractMovieMetadata(item);
          await recordMovieInteraction(itemId, 'seen', movieMetadata);
        } catch (error) {
          console.error('Error recording seen interaction:', error);
        }
      }
      
      // Keep the item in the list; UI will now show Seen badge
      setWatchlistItems(prev => prev);
    } catch (e) {
      console.error('Failed to mark item as seen', e);
    }
  };

  const renderWatchlistItem = ({ item }: { item: WatchlistItem }) => (
    <WatchlistRow
      item={item}
      onMarkSeen={markItemAsSeen}
      onDelete={removeFromWatchlistImmediate}
    />
  );

  const availableGenres = useMemo(() => {
    // Show all known genres so users can pre-filter even if not present
    return ALL_GENRES;
  }, []);

  const userSeenIds = useMemo(() => {
    const set = new Set<number>();
    if (user) {
      for (const id of user.preferences.seen ?? []) set.add(id);
    }
    return set;
  }, [user?.preferences.seen]);

  const displayedItems = useMemo(() => {
    let items = watchlistItems;
    // Seen filter first
    if (seenFilter !== 'all') {
      const mustBeSeen = seenFilter === 'seen';
      items = items.filter(i => mustBeSeen ? userSeenIds.has(i.id) : !userSeenIds.has(i.id));
    }
    // Genre filter
    if (selectedGenre) {
      items = items.filter(i => i.genreNames.includes(selectedGenre));
    }
    return items;
  }, [watchlistItems, selectedGenre, seenFilter, userSeenIds]);

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
        <ActivityIndicator size="large" color="#3A5683" />
        <ThemedText style={styles.loadingText}>Loading your watchlist...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>My Watchlist</ThemedText>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.filterButton} onPress={() => setIsFilterOpen(true)}>
            <Ionicons name="filter" size={18} color="#FFFFFF" />
            <Text style={styles.filterButtonText}>Filter</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={displayedItems}
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

      <Modal visible={isFilterOpen} transparent animationType="fade" onRequestClose={() => setIsFilterOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.tabsRow}>
              <TouchableOpacity
                style={[styles.tabButton, activeFilterTab === 'Genres' && styles.tabButtonActive]}
                onPress={() => setActiveFilterTab('Genres')}
              >
                <Text style={[styles.tabButtonText, activeFilterTab === 'Genres' && styles.tabButtonTextActive]}>Genres</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, activeFilterTab === 'Seen' && styles.tabButtonActive]}
                onPress={() => setActiveFilterTab('Seen')}
              >
                <Text style={[styles.tabButtonText, activeFilterTab === 'Seen' && styles.tabButtonTextActive]}>Seen</Text>
              </TouchableOpacity>
            </View>

            {activeFilterTab === 'Genres' ? (
              <View style={styles.genreChipsContainer}>
                <TouchableOpacity
                  style={[styles.chip, !selectedGenre && styles.chipSelected]}
                  onPress={() => setSelectedGenre(null)}
                >
                  <Text style={[styles.chipText, !selectedGenre && styles.chipTextSelected]}>All</Text>
                </TouchableOpacity>
                {availableGenres.map(g => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.chip, selectedGenre === g && styles.chipSelected]}
                    onPress={() => setSelectedGenre(g)}
                  >
                    <Text style={[styles.chipText, selectedGenre === g && styles.chipTextSelected]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.genreChipsContainer}>
                <TouchableOpacity
                  style={[styles.chip, seenFilter === 'all' && styles.chipSelected]}
                  onPress={() => setSeenFilter('all')}
                >
                  <Text style={[styles.chipText, seenFilter === 'all' && styles.chipTextSelected]}>All</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.chip, seenFilter === 'seen' && styles.chipSelected]}
                  onPress={() => setSeenFilter('seen')}
                >
                  <Text style={[styles.chipText, seenFilter === 'seen' && styles.chipTextSelected]}>Seen</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.chip, seenFilter === 'unseen' && styles.chipSelected]}
                  onPress={() => setSeenFilter('unseen')}
                >
                  <Text style={[styles.chipText, seenFilter === 'unseen' && styles.chipTextSelected]}>Unseen</Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalButton} onPress={() => setIsFilterOpen(false)}>
                <Text style={styles.modalButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    color: '#000000', // Black text on primary background
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8, // Added margin to create space between title and filter button
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 999,
    backgroundColor: '#f7f7f7',
  },
  tabButtonActive: {
    backgroundColor: '#3A5683', // Secondary color for active tab
    borderColor: '#3A5683',
  },
  tabButtonText: {
    color: '#000000', // Black text on tertiary background
    fontWeight: '600',
  },
  tabButtonTextActive: {
    color: '#FFFFFF', // White text on secondary background
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#3A5683',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#3A5683', // Secondary background
  },
  filterButtonText: {
    color: '#FFFFFF', // White text on secondary
    fontWeight: '600',
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
  swipeContainer: {
    position: 'relative',
  },
  revealRight: {
    position: 'absolute',
    right: 20,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'flex-end',
    zIndex: 0,
  },
  revealText: {
    color: '#000000', // Black text as requested
    fontWeight: '800',
    fontSize: 18,
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
  movieTitle: { color: '#007AFF' },
  tvTitle: { color: '#34C759' },
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
  seenBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#34C759',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 8,
  },
  seenBadgeText: {
    color: 'white',
    fontWeight: '700',
  },
  seenBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 0,
    position: 'absolute',
    top: 8,
    right: 8,
  },
  seenBadgeTextSmall: {
    fontSize: 10,
    fontWeight: '800',
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 20, // Reduced bottom padding
    height: 300, // Increased height to accommodate more spacing
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  genreChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    height: 120, // Increased height for chips area
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#3A5683', // Secondary color for border
    backgroundColor: '#FFFFFF', // Tertiary color for background
  },
  chipSelected: {
    backgroundColor: '#3A5683', // Secondary color for selected background
    borderColor: '#3A5683',
  },
  chipText: {
    fontSize: 14,
    color: '#000000', // Black text on tertiary background
  },
  chipTextSelected: {
    color: '#FFFFFF', // White text on secondary background
    fontWeight: '600',
  },
  modalActions: {
    marginTop: 60, // Increased top margin to push Done button further down
    alignItems: 'flex-end',
  },
  modalButton: {
    backgroundColor: '#3A5683', // Secondary color for button
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  modalButtonText: {
    color: '#FFFFFF', // White text on secondary color
    fontWeight: '600',
  },
});
