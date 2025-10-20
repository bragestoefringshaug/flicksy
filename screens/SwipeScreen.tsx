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
 * @version 2.0.0 - Simplified and stable version
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { MovieMetadata } from '../services/firebaseDb';
import { Movie, movieApi, TVShow } from '../services/movieApi';
import { recommendationService } from '../services/recommendationService';

// Screen dimensions for responsive design
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

/**
 * Main SwipeScreen component - Simplified and stable version
 */
export default function SwipeScreen(): React.ReactElement {
  // ==================== HOOKS AND STATE ====================
  
  const { user, updatePreferences, recordMovieInteraction } = useAuth();
  
  // Core state - simplified
  const [allCards, setAllCards] = useState<(Movie | TVShow)[]>([]);
  const [cardStack, setCardStack] = useState<(Movie | TVShow)[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [swipedCardIds, setSwipedCardIds] = useState<Set<number>>(new Set());
  const [recentlyShownIds, setRecentlyShownIds] = useState<Set<number>>(new Set());
  
  // Refs to prevent infinite loops
  const isLoadingRef = useRef(false);
  const hasInitializedRef = useRef(false);

  // ==================== UTILITY FUNCTIONS ====================
  
  const shuffleArray = (array: any[]): any[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const cleanupInvalidUserPreferences = async () => {
    if (!user || !user.preferences) return;
    
    try {
      console.log('Cleaning up invalid user preferences...');
      
      const likedMovies = user.preferences.likedMovies || [];
      const dislikedMovies = user.preferences.dislikedMovies || [];
      const watchlist = user.preferences.watchlist || [];
      
      const validLikedMovies = await movieApi.filterValidIds(likedMovies);
      const validDislikedMovies = await movieApi.filterValidIds(dislikedMovies);
      const validWatchlist = await movieApi.filterValidIds(watchlist);
      
      const invalidLikedMovies = likedMovies.filter(id => !validLikedMovies.includes(id));
      const invalidDislikedMovies = dislikedMovies.filter(id => !validDislikedMovies.includes(id));
      const invalidWatchlist = watchlist.filter(id => !validWatchlist.includes(id));
      
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

  // ==================== CORE FUNCTIONS ====================
  
  /**
   * Extract movie metadata for ML purposes
   */
  const extractMovieMetadata = (item: Movie | TVShow): MovieMetadata => {
    const isMovie = 'title' in item;
    const releaseDate = isMovie ? item.release_date : item.first_air_date;
    const releaseYear = releaseDate ? new Date(releaseDate).getFullYear() : 0;
    
    return {
      title: isMovie ? item.title : item.name,
      genres: item.genre_ids || [],
      releaseYear,
      popularity: item.popularity || 0,
      isMovie
    };
  };
  
  const loadInitialCards = async () => {
    if (isLoadingRef.current) return;
    
    try {
      isLoadingRef.current = true;
      setIsLoading(true);
      
      console.log('🔄 Starting to load initial cards...');
      console.log('👤 User:', user ? 'Authenticated' : 'Not authenticated');
      
      let initialCards: (Movie | TVShow)[] = [];
      
      if (user && user.preferences && (user.preferences.likedMovies?.length > 0 || user.preferences.genres?.length > 0)) {
        console.log('🎯 Loading personalized recommendations...');
        await cleanupInvalidUserPreferences();
        const swipedIdsArray = Array.from(swipedCardIds);
        initialCards = await recommendationService.getPersonalizedRecommendations(
          user.preferences,
          50,
          swipedIdsArray
        );
      } else {
        console.log('🎬 Loading general content...');
        const [page1, page2, page3] = await Promise.all([
          movieApi.getMixedContent(1),
          movieApi.getMixedContent(2),
          movieApi.getMixedContent(3)
        ]);
        const allContent = [...page1, ...page2, ...page3];
        const swipedIdsArray = Array.from(swipedCardIds);
        initialCards = allContent.filter(card => !swipedIdsArray.includes(card.id));
      }
      
      console.log(`📦 Loaded ${initialCards.length} cards`);
      
      const shuffledCards = shuffleArray(initialCards);
      setAllCards(shuffledCards);
      setCardStack(shuffledCards.slice(0, 5));
      
      console.log(`🎴 Set card stack with ${shuffledCards.slice(0, 5).length} cards`);
      
    } catch (error) {
      console.error('❌ Error loading initial cards:', error);
      Alert.alert('Error', 'Failed to load movies and TV shows');
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
      console.log('✅ Finished loading initial cards');
    }
  };

  const loadMoreCards = async () => {
    if (isLoadingRef.current) return;
    
    try {
      isLoadingRef.current = true;
      
      let newCards: (Movie | TVShow)[] = [];
      
      if (user && user.preferences && (user.preferences.likedMovies?.length > 0 || user.preferences.genres?.length > 0)) {
        await cleanupInvalidUserPreferences();
        const swipedIdsArray = Array.from(swipedCardIds);
        newCards = await recommendationService.getPersonalizedRecommendations(
          user.preferences,
          30,
          swipedIdsArray
        );
      } else {
        const currentPage = Math.floor(allCards.length / 20) + 1;
        const [page1, page2] = await Promise.all([
          movieApi.getMixedContent(currentPage),
          movieApi.getMixedContent(currentPage + 1)
        ]);
        const allNewContent = [...page1, ...page2];
        const swipedIdsArray = Array.from(swipedCardIds);
        newCards = allNewContent.filter(card => !swipedIdsArray.includes(card.id));
      }
      
      const filteredNewCards = newCards.filter(card => !recentlyShownIds.has(card.id));
      const shuffledNewCards = shuffleArray(filteredNewCards);
      
      setAllCards(prev => [...prev, ...shuffledNewCards]);
      console.log(`Loaded ${shuffledNewCards.length} new cards`);
      
    } catch (error) {
      console.error('Error loading more cards:', error);
    } finally {
      isLoadingRef.current = false;
    }
  };

  const refillCardStack = useCallback(() => {
    setCardStack(prevStack => {
      if (prevStack.length >= 5) return prevStack;
      
      const availableCards = allCards.filter(card => 
        !swipedCardIds.has(card.id) && !recentlyShownIds.has(card.id)
      );
      const cardsNotInStack = availableCards.filter(card => 
        !prevStack.some(stackCard => stackCard.id === card.id)
      );
      
      if (cardsNotInStack.length > 0) {
        const shuffledCards = shuffleArray(cardsNotInStack);
        const cardsToAdd = shuffledCards.slice(0, 5 - prevStack.length);
        
        setRecentlyShownIds(prev => {
          const newSet = new Set(prev);
          cardsToAdd.forEach(card => newSet.add(card.id));
          return newSet;
        });
        
        return [...prevStack, ...cardsToAdd];
      } else if (allCards.length > 0) {
        // Trigger loading more cards
        loadMoreCards();
      }
      
      return prevStack;
    });
  }, [allCards, swipedCardIds, recentlyShownIds]);

  const moveToNextCard = useCallback(() => {
    setCardStack(prevStack => {
      const newStack = prevStack.slice(1);
      
      const availableCards = allCards.filter(card => 
        !swipedCardIds.has(card.id) && !recentlyShownIds.has(card.id)
      );
      const cardsNotInStack = availableCards.filter(card => 
        !newStack.some(stackCard => stackCard.id === card.id)
      );
      
      if (cardsNotInStack.length > 0) {
        const shuffledCards = shuffleArray(cardsNotInStack);
        const nextCard = shuffledCards[0];
        newStack.push(nextCard);
        
        setRecentlyShownIds(prev => new Set([...prev, nextCard.id]));
      } else if (allCards.length > 0) {
        loadMoreCards();
      }
      
      return newStack;
    });
  }, [allCards, swipedCardIds, recentlyShownIds]);

  // ==================== EFFECTS ====================
  
  // Initialize on mount - only run once
  useEffect(() => {
    console.log('🚀 SwipeScreen mounted, hasInitialized:', hasInitializedRef.current);
    if (!hasInitializedRef.current) {
      console.log('🎬 Initializing SwipeScreen...');
      hasInitializedRef.current = true;
      loadInitialCards();
    }
  }, []);

  // Refill card stack when needed - stable dependencies
  useEffect(() => {
    if (cardStack.length < 5 && allCards.length > 0 && !isLoading) {
      const timeoutId = setTimeout(refillCardStack, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [cardStack.length, allCards.length, isLoading, refillCardStack]);

  // Clear recently shown cards periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setRecentlyShownIds(prev => {
        const recentArray = Array.from(prev);
        if (recentArray.length > 20) {
          const keepRecent = recentArray.slice(-20);
          return new Set(keepRecent);
        }
        return prev;
      });
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // ==================== EVENT HANDLERS ====================
  
  const handleSwipeLeft = useCallback(async (item: Movie | TVShow) => {
    console.log('handleSwipeLeft called with:', 'title' in item ? item.title : item.name);
    
    setSwipedCardIds(prev => new Set([...prev, item.id]));
    
    if (user && user.preferences) {
      const updatedDisliked = [...(user.preferences.dislikedMovies || []), item.id];
      await updatePreferences({ dislikedMovies: updatedDisliked });
      
      // Record interaction for ML
      try {
        const movieMetadata = extractMovieMetadata(item);
        await recordMovieInteraction(item.id, 'disliked', movieMetadata);
      } catch (error) {
        console.error('Error recording disliked interaction:', error);
      }
    }

    moveToNextCard();
    
    // Load more cards if running low
    const availableCards = allCards.filter(card => !swipedCardIds.has(card.id));
    if (availableCards.length < 15) {
      loadMoreCards();
    }
  }, [user, updatePreferences, recordMovieInteraction, moveToNextCard, allCards, swipedCardIds]);

  const handleSwipeRight = useCallback(async (item: Movie | TVShow) => {
    console.log('handleSwipeRight called with:', 'title' in item ? item.title : item.name);
    
    setSwipedCardIds(prev => new Set([...prev, item.id]));
    
    if (user && user.preferences) {
      const updatedLiked = [...(user.preferences.likedMovies || []), item.id];
      const updatedWatchlist = [...(user.preferences.watchlist || []), item.id];
      await updatePreferences({ 
        likedMovies: updatedLiked,
        watchlist: updatedWatchlist 
      });
      
      // Record interactions for ML
      try {
        const movieMetadata = extractMovieMetadata(item);
        await recordMovieInteraction(item.id, 'liked', movieMetadata);
        await recordMovieInteraction(item.id, 'watchlisted', movieMetadata);
      } catch (error) {
        console.error('Error recording liked/watchlisted interactions:', error);
      }
    }

    moveToNextCard();
    
    // Load more cards if running low
    const availableCards = allCards.filter(card => !swipedCardIds.has(card.id));
    if (availableCards.length < 15) {
      loadMoreCards();
    }
  }, [user, updatePreferences, recordMovieInteraction, moveToNextCard, allCards, swipedCardIds]);

  const handleRefresh = useCallback(() => {
    setSwipedCardIds(new Set());
    setRecentlyShownIds(new Set());
    setAllCards([]);
    setCardStack([]);
    hasInitializedRef.current = false;
    loadInitialCards();
  }, []);

  // ==================== RENDER ====================
  
  console.log('🎭 SwipeScreen render - isLoading:', isLoading, 'cardStack.length:', cardStack.length, 'allCards.length:', allCards.length);
  
  if (isLoading) {
    console.log('⏳ Showing loading screen...');
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <ThemedText style={styles.loadingText}>Loading movies and TV shows...</ThemedText>
      </ThemedView>
    );
  }

  if (cardStack.length === 0) {
    console.log('🔍 Showing "Finding great picks" screen...');
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <ThemedText style={styles.loadingText}>Finding great picks for you...</ThemedText>
        <ThemedText style={styles.loadingSubtext}>Refreshing recommendations...</ThemedText>
      </ThemedView>
    );
  }

  console.log('🎴 Showing card stack with', cardStack.length, 'cards');

  return (
    <ThemedView style={styles.container}>
      <View style={styles.cardContainer}>
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
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    position: 'relative',
  },
});