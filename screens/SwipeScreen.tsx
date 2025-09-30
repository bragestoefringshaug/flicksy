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

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function SwipeScreen() {
  const { user, updatePreferences } = useAuth();
  const [allCards, setAllCards] = useState<(Movie | TVShow)[]>([]);
  const [cardStack, setCardStack] = useState<(Movie | TVShow)[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [swipedCardIds, setSwipedCardIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadInitialCards();
  }, []);

  // Ensure we always have exactly 5 cards in the stack
  useEffect(() => {
    if (cardStack.length < 5 && allCards.length > 0) {
      console.log(`Card stack has ${cardStack.length} cards, refilling to 5...`);
      const availableCards = allCards.filter(card => !swipedCardIds.has(card.id));
      const cardsNotInStack = availableCards.filter(card => 
        !cardStack.some(stackCard => stackCard.id === card.id)
      );
      
      if (cardsNotInStack.length > 0) {
        const cardsToAdd = cardsNotInStack.slice(0, 5 - cardStack.length);
        setCardStack(prevStack => [...prevStack, ...cardsToAdd]);
      }
    }
  }, [cardStack.length, allCards, swipedCardIds, cardStack]);

  const loadInitialCards = async () => {
    try {
      setIsLoading(true);
      let initialCards: (Movie | TVShow)[] = [];
      
      if (user && (user.preferences.likedMovies.length > 0 || user.preferences.genres.length > 0)) {
        // Use personalized recommendations if user has preferences
        initialCards = await recommendationService.getPersonalizedRecommendations(
          user.preferences,
          30
        );
      } else {
        // Use general popular content for new users
        initialCards = await movieApi.getMixedContent(1);
      }
      
      setAllCards(initialCards);
      // Initialize card stack with first 5 cards
      setCardStack(initialCards.slice(0, 5));
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
      
      if (user && (user.preferences.likedMovies.length > 0 || user.preferences.genres.length > 0)) {
        // Use personalized recommendations
        newCards = await recommendationService.getPersonalizedRecommendations(
          user.preferences,
          20
        );
      } else {
        // Use general content
        const nextPage = Math.floor(allCards.length / 20) + 1;
        newCards = await movieApi.getMixedContent(nextPage);
      }
      
      setAllCards(prev => [...prev, ...newCards]);
    } catch (error) {
      console.error('Error loading more cards:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const moveToNextCard = useCallback(() => {
    setCardStack(prevStack => {
      const newStack = prevStack.slice(1); // Remove the top card
      
      // Add the next recommended card to maintain 5 cards
      const availableCards = allCards.filter(card => !swipedCardIds.has(card.id));
      const nextCard = availableCards.find(card => 
        !newStack.some(stackCard => stackCard.id === card.id)
      );
      
      if (nextCard) {
        newStack.push(nextCard);
      }
      
      return newStack;
    });
  }, [allCards, swipedCardIds]);

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
    loadInitialCards();
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <ThemedText style={styles.loadingText}>Loading movies and TV shows...</ThemedText>
      </ThemedView>
    );
  }

  if (cardStack.length === 0) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <ThemedText style={styles.loadingText}>Finding great picks for you...</ThemedText>
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
