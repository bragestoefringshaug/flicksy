/**
 * SwipeScreen Component
 * 
 * The main swiping interface where users can discover and rate movies/TV shows.
 * Features include:
 * - Card stack management (always maintains 5 cards)
 * - Swipe gestures for liking/disliking content
 * - Infinite scroll with automatic loading
 * - Recommendation system integration
 * - User preference tracking
 * 
 * @author Flicksy Team
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    StyleSheet,
    View
} from 'react-native';
import MovieCard from '../components/MovieCard';
import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import { useAuth } from '../contexts/AuthContext';
import { Movie, movieApi, TVShow } from '../services/movieApi';
import { recommendationService } from '../services/recommendationService';

// Screen dimensions for responsive design
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

/**
 * Main SwipeScreen component
 * 
 * Manages the card stack, handles user interactions, and integrates with
 * the recommendation system to provide personalized content discovery.
 */
export default function SwipeScreen(): React.ReactElement {
  // ==================== HOOKS AND STATE ====================
  
  const { user, updatePreferences } = useAuth(); // Authentication context
  
  // State management for card data and UI
  const [allCards, setAllCards] = useState<(Movie | TVShow)[]>([]); // All loaded cards
  const [cardStack, setCardStack] = useState<(Movie | TVShow)[]>([]); // Current 5-card stack
  const [isLoading, setIsLoading] = useState(true); // Initial loading state
  const [isLoadingMore, setIsLoadingMore] = useState(false); // Loading more cards state
  const [swipedCardIds, setSwipedCardIds] = useState<Set<number>>(new Set()); // Track swiped cards
  const [recentlyShownIds, setRecentlyShownIds] = useState<Set<number>>(new Set()); // Track recently shown cards to prevent immediate repetition

  // ==================== UTILITY FUNCTIONS ====================
  
  /**
   * Shuffle an array using Fisher-Yates algorithm
   * 
   * @param array - Array to shuffle
   * @returns T[] - New shuffled array (original array is not modified)
   */
  const shuffleArray = (array: any[]): any[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };
  
  /**
   * Clean up invalid movie/TV show IDs from user preferences
   * 
   * This function validates all IDs in the user's preferences and removes
   * any that don't exist in the TMDB database to prevent API errors.
   */
  const cleanupInvalidUserPreferences = async () => {
    if (!user) return;
    
    try {
      console.log('Cleaning up invalid user preferences...');
      
      // Validate liked movies
      const validLikedMovies = await movieApi.filterValidIds(user.preferences.likedMovies);
      const invalidLikedMovies = user.preferences.likedMovies.filter(id => !validLikedMovies.includes(id));
      
      // Validate disliked movies
      const validDislikedMovies = await movieApi.filterValidIds(user.preferences.dislikedMovies);
      const invalidDislikedMovies = user.preferences.dislikedMovies.filter(id => !validDislikedMovies.includes(id));
      
      // Validate watchlist
      const validWatchlist = await movieApi.filterValidIds(user.preferences.watchlist);
      const invalidWatchlist = user.preferences.watchlist.filter(id => !validWatchlist.includes(id));
      
      // Update preferences if there were invalid IDs
      if (invalidLikedMovies.length > 0 || invalidDislikedMovies.length > 0 || invalidWatchlist.length > 0) {
        console.log(`Removing ${invalidLikedMovies.length} invalid liked movies, ${invalidDislikedMovies.length} invalid disliked movies, ${invalidWatchlist.length} invalid watchlist items`);
        
        await updatePreferences({
          likedMovies: validLikedMovies,
          dislikedMovies: validDislikedMovies,
          watchlist: validWatchlist
        });
        
        console.log('User preferences cleaned up successfully');
      }
    } catch (error) {
      console.error('Error cleaning up user preferences:', error);
    }
  };

  // ==================== EFFECTS ====================
  
  /**
   * Load initial cards when component mounts
   */
  useEffect(() => {
    loadInitialCards();
  }, []);

  /**
   * Maintain exactly 5 cards in the stack at all times
   * 
   * This effect ensures the card stack always has 5 cards for smooth swiping.
   * It refills the stack with available cards when cards are swiped away.
   */
  useEffect(() => {
    if (cardStack.length < 5 && allCards.length > 0) {
      console.log(`Card stack has ${cardStack.length} cards, refilling to 5...`);
      const availableCards = allCards.filter(card => 
        !swipedCardIds.has(card.id) && !recentlyShownIds.has(card.id)
      );
      const cardsNotInStack = availableCards.filter(card => 
        !cardStack.some(stackCard => stackCard.id === card.id)
      );
      
      if (cardsNotInStack.length > 0) {
        // Shuffle available cards to add randomness
        const shuffledCards = shuffleArray(cardsNotInStack);
        const cardsToAdd = shuffledCards.slice(0, 5 - cardStack.length);
        setCardStack(prevStack => [...prevStack, ...cardsToAdd]);
        
        // Add new cards to recently shown tracking
        setRecentlyShownIds(prev => {
          const newSet = new Set(prev);
          cardsToAdd.forEach(card => newSet.add(card.id));
          return newSet;
        });
      } else {
        // No more available cards, trigger loading more
        console.log('No more available cards, loading more...');
        loadMoreCards();
      }
    } else if (cardStack.length < 5 && allCards.length === 0) {
      // No cards at all, reload everything
      console.log('No cards available, reloading...');
      loadInitialCards();
    }
  }, [cardStack.length, allCards, swipedCardIds, cardStack, recentlyShownIds]);

  /**
   * Load initial cards for the swipe interface
   * 
   * This function determines whether to load personalized recommendations
   * (for existing users with preferences) or mixed content (for new users).
   * It sets up the initial card stack with the first 5 cards.
   */
  const loadInitialCards = async () => {
    try {
      setIsLoading(true);
      let initialCards: (Movie | TVShow)[] = [];
      
      // Decide between personalized vs general content
      if (user && (user.preferences.likedMovies.length > 0 || user.preferences.genres.length > 0)) {
        // Personalized recommendations
        await cleanupInvalidUserPreferences();
        const swipedIdsArray = Array.from(swipedCardIds);
        initialCards = await recommendationService.getPersonalizedRecommendations(
          user.preferences,
          50,
          swipedIdsArray
        );
      } else {
        // General popular content for new users - load from multiple pages
        const [page1, page2, page3] = await Promise.all([
          movieApi.getMixedContent(1),
          movieApi.getMixedContent(2),
          movieApi.getMixedContent(3)
        ]);
        const allContent = [...page1, ...page2, ...page3];
        const swipedIdsArray = Array.from(swipedCardIds);
        initialCards = allContent.filter(card => !swipedIdsArray.includes(card.id));
      }
      
      // Shuffle the initial cards for better randomness
      const shuffledCards = shuffleArray(initialCards);
      
      setAllCards(shuffledCards);
      // Initialize card stack with first 5 cards
      setCardStack(shuffledCards.slice(0, 5));
    } catch (error) {
      console.error('Error loading initial cards:', error);
      Alert.alert('Error', 'Failed to load movies and TV shows');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMoreCards = async () => {
    if (isLoadingMore) return;

    try {
      setIsLoadingMore(true);
      let newCards: (Movie | TVShow)[] = [];
      
      // Decide between personalized vs general content
      if (user && (user.preferences.likedMovies.length > 0 || user.preferences.genres.length > 0)) {
        // Personalized recommendations
        await cleanupInvalidUserPreferences();
        const swipedIdsArray = Array.from(swipedCardIds);
        newCards = await recommendationService.getPersonalizedRecommendations(
          user.preferences,
          30,
          swipedIdsArray
        );
      } else {
        // General content from multiple pages for better diversity
        const currentPage = Math.floor(allCards.length / 20) + 1;
        const [page1, page2] = await Promise.all([
          movieApi.getMixedContent(currentPage),
          movieApi.getMixedContent(currentPage + 1)
        ]);
        const allNewContent = [...page1, ...page2];
        const swipedIdsArray = Array.from(swipedCardIds);
        newCards = allNewContent.filter(card => !swipedIdsArray.includes(card.id));
      }
      
      // Filter out cards that are recently shown (swiped cards already filtered above)
      const filteredNewCards = newCards.filter(card => 
        !recentlyShownIds.has(card.id)
      );
      
      // Shuffle new cards before adding to prevent clustering
      const shuffledNewCards = shuffleArray(filteredNewCards);
      setAllCards(prev => [...prev, ...shuffledNewCards]);
      
      console.log(`Loaded ${shuffledNewCards.length} new cards (filtered from ${newCards.length} total, excluded ${newCards.length - filteredNewCards.length} recently shown)`);
    } catch (error) {
      console.error('Error loading more cards:', error);
      // If loading fails, try to reload everything
      if (allCards.length === 0) {
        console.log('Loading failed and no cards available, attempting full reload...');
        loadInitialCards();
      }
    } finally {
      setIsLoadingMore(false);
    }
  };

  const moveToNextCard = useCallback(() => {
    setCardStack(prevStack => {
      const newStack = prevStack.slice(1); // Remove the top card
      
      // Add the next recommended card to maintain 5 cards
      const availableCards = allCards.filter(card => 
        !swipedCardIds.has(card.id) && !recentlyShownIds.has(card.id)
      );
      const cardsNotInStack = availableCards.filter(card => 
        !newStack.some(stackCard => stackCard.id === card.id)
      );
      
      if (cardsNotInStack.length > 0) {
        // Shuffle available cards to add randomness
        const shuffledCards = shuffleArray(cardsNotInStack);
        const nextCard = shuffledCards[0];
        newStack.push(nextCard);
        
        // Add to recently shown tracking
        setRecentlyShownIds(prev => new Set([...prev, nextCard.id]));
      } else {
        // No more cards available, trigger loading more
        console.log('No more cards available in moveToNextCard, triggering loadMoreCards');
        loadMoreCards();
      }
      
      return newStack;
    });
  }, [allCards, swipedCardIds, recentlyShownIds]);

  const handleSwipeLeft = useCallback(async (item: Movie | TVShow) => {
    console.log('handleSwipeLeft called with:', item);
    
    // Mark this card as swiped
    setSwipedCardIds(prev => new Set([...prev, item.id]));
    
    // Update user preferences
    if (user) {
      const updatedDisliked = [...user.preferences.dislikedMovies, item.id];
      await updatePreferences({ dislikedMovies: updatedDisliked });
      console.log('Updated disliked movies');
    }

    // Move to next card immediately
    moveToNextCard();
    
    // Load more cards if we're running low
    const availableCards = allCards.filter(card => !swipedCardIds.has(card.id));
    if (availableCards.length < 15) {
      loadMoreCards();
    }
  }, [user, updatePreferences, moveToNextCard, allCards.length, swipedCardIds.size]);

  const handleSwipeRight = useCallback(async (item: Movie | TVShow) => {
    console.log('handleSwipeRight called with:', item);
    
    // Mark this card as swiped
    setSwipedCardIds(prev => new Set([...prev, item.id]));
    
    // Update user preferences
    if (user) {
      const updatedLiked = [...user.preferences.likedMovies, item.id];
      const updatedWatchlist = [...user.preferences.watchlist, item.id];
      await updatePreferences({ 
        likedMovies: updatedLiked,
        watchlist: updatedWatchlist 
      });
      console.log('Updated liked movies and watchlist');
    }

    // Move to next card immediately
    moveToNextCard();
    
    // Load more cards if we're running low
    const availableCards = allCards.filter(card => !swipedCardIds.has(card.id));
    if (availableCards.length < 15) {
      loadMoreCards();
    }
  }, [user, updatePreferences, moveToNextCard, allCards.length, swipedCardIds.size]);

  const handleRefresh = () => {
    // Clear swiped cards and reload everything fresh
    setSwipedCardIds(new Set());
    setRecentlyShownIds(new Set());
    setAllCards([]);
    setCardStack([]);
    loadInitialCards();
  };

  // Periodically clear recently shown cards to allow them to be shown again
  useEffect(() => {
    const interval = setInterval(() => {
      setRecentlyShownIds(prev => {
        // Keep only the last 20 recently shown cards to prevent memory buildup
        const recentArray = Array.from(prev);
        if (recentArray.length > 20) {
          const keepRecent = recentArray.slice(-20);
          return new Set(keepRecent);
        }
        return prev;
      });
    }, 30000); // Clear every 30 seconds

    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <ThemedText style={styles.loadingText}>Loading movies and TV shows...</ThemedText>
      </ThemedView>
    );
  }

  if (cardStack.length === 0) {
    // If we have no cards and we're not loading, try to reload
    if (!isLoading && !isLoadingMore) {
      console.log('Card stack is empty and not loading, attempting to reload...');
      loadInitialCards();
    }
    
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <ThemedText style={styles.loadingText}>Finding great picks for you...</ThemedText>
        <ThemedText style={styles.loadingSubtext}>
          {isLoading ? 'Loading content...' : 'Refreshing recommendations...'}
        </ThemedText>
      </ThemedView>
    );
  }
  

  return (
    <ThemedView style={styles.container}>

      <View style={styles.cardContainer}>
        {/* Render cards in reverse order (furthest back first) */}
        {cardStack.map((card, index) => {
          const isTopCard = index === 0;
          const isNextCard = index === 1;
          const isThirdCard = index === 2;
          const isFourthCard = index === 3;
          const isFifthCard = index === 4;
          
          return (
            <MovieCard
              key={card.id}
              item={card}
              onSwipeLeft={() => handleSwipeLeft(card)}
              onSwipeRight={() => handleSwipeRight(card)}
              isTopCard={isTopCard}
              isNextCard={isNextCard}
              isThirdCard={isThirdCard}
              isFourthCard={isFourthCard}
              isFifthCard={isFifthCard}
            />
          );
        })}
      </View>

      {/* footer removed to allow full-height card */}
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
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  refreshButton: {
    padding: 8,
  },
  refreshButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    position: 'relative',
  },
  
});
