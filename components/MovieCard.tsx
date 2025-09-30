/**
 * MovieCard Component
 * 
 * A swipeable card component that displays movie or TV show information.
 * Features include:
 * - Swipe gestures (left/right) for user interaction
 * - Animated transitions and positioning
 * - Responsive design for different screen sizes
 * - Genre display and image handling
 * - Like/Dislike buttons with haptic feedback
 * 
 * @author Flicksy Team
 * @version 1.0.0
 */

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Movie, movieApi, TVShow } from '../services/movieApi';

// Screen dimensions for responsive design
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const CARD_WIDTH = screenWidth;

/**
 * Props interface for MovieCard component
 */
interface MovieCardProps {
  item: Movie | TVShow; // The movie or TV show data to display
  onSwipeLeft: () => void; // Callback when user swipes left (dislike)
  onSwipeRight: () => void; // Callback when user swipes right (like)
  isTopCard: boolean; // Whether this is the top card in the stack
  isNextCard?: boolean; // Whether this is the second card
  isThirdCard?: boolean; // Whether this is the third card
  isFourthCard?: boolean; // Whether this is the fourth card
  isFifthCard?: boolean; // Whether this is the fifth card
}

/**
 * MovieCard Component
 * 
 * Main component that renders a swipeable movie/TV show card with interactive features.
 * Handles gestures, animations, and responsive design for different screen sizes.
 */
export default function MovieCard({ 
  item, 
  onSwipeLeft, 
  onSwipeRight, 
  isTopCard, 
  isNextCard = false, 
  isThirdCard = false, 
  isFourthCard = false, 
  isFifthCard = false 
}: MovieCardProps) {
  // ==================== HOOKS AND STATE ====================
  
  const insets = useSafeAreaInsets(); // Safe area insets for device-specific spacing
  const cardHeight = Math.max(0, screenHeight); // Full screen height for the card
  
  // ==================== RESPONSIVE DESIGN CALCULATIONS ====================
  
  // Calculate responsive positioning based on device dimensions
  const isSmallDevice = screenHeight < 700; // Small phones (iPhone SE, etc.)
  const isLargeDevice = screenHeight > 900; // Large phones (iPhone Pro Max, etc.)
  
  // Dynamic spacing based on device size
  const baseSpacing = isSmallDevice ? 15 : isLargeDevice ? 25 : 20;
  
  // Tab bar height estimation (varies by device)
  const tabBarHeight = isSmallDevice ? 60 : isLargeDevice ? 80 : 70;
  
  // Button positioning - above tab bar with safe area and extra padding
  const buttonSpacing = tabBarHeight + insets.bottom + (isSmallDevice ? 25 : isLargeDevice ? 35 : 30);
  
  // Content positioning - above buttons with proper spacing
  const contentSpacing = buttonSpacing + (isSmallDevice ? 70 : isLargeDevice ? 90 : 80);
  
  // ==================== ANIMATION STATE ====================
  
  // Separate animated values for different purposes
  const dragX = useRef(new Animated.Value(0)).current; // Horizontal drag position
  const dragY = useRef(new Animated.Value(0)).current; // Vertical drag position
  const rotation = useRef(new Animated.Value(0)).current; // Card rotation during swipe
  const scale = useRef(new Animated.Value(1)).current; // Card scale for visual feedback
  const opacity = useRef(new Animated.Value(1)).current; // Card opacity for fade effects
  const flip = useRef(new Animated.Value(0)).current; // Card flip animation (front/back)
  const [isFlipped, setIsFlipped] = React.useState(false); // Track flip state

  // ==================== EFFECTS ====================
  
  /**
   * Reset card animation when it becomes the top card
   * This ensures smooth transitions when cards move up in the stack
   */
  useEffect(() => {
    if (isTopCard) {
      resetCard();
    }
  }, [isTopCard]);

  // ==================== DATA PROCESSING ====================
  
  // Determine if the item is a movie or TV show and extract relevant data
  const isMovie = 'title' in item; // Movies have 'title', TV shows have 'name'
  const title = isMovie ? item.title : item.name;
  const releaseDate = isMovie ? item.release_date : item.first_air_date;
  const year = releaseDate ? new Date(releaseDate).getFullYear() : 'N/A';

  // Create responsive styles inside component
  const styles = StyleSheet.create({
    cardContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
    },
    nextCardContainer: {
      top: 0,
      left: 0,
      zIndex: 1,
      opacity: 1,
    },
    thirdCardContainer: {
      top: 0,
      left: 0,
      zIndex: 0,
      opacity: 1,
    },
    fourthCardContainer: {
      top: 0,
      left: 0,
      zIndex: -1,
      opacity: 0.8,
    },
    fifthCardContainer: {
      top: 0,
      left: 0,
      zIndex: -2,
      opacity: 0.6,
    },
    card: {
      width: CARD_WIDTH,
      height: cardHeight,
      borderRadius: 20,
      backgroundColor: '#fff',
      position: 'absolute',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    image: {
      width: '100%',
      height: '100%',
      borderRadius: 20,
    },
    backgroundImage: {
      width: '100%',
      height: '100%',
      position: 'absolute',
    },
    gradient: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: '60%',
    },
    content: {
      position: 'absolute',
      bottom: contentSpacing + (isSmallDevice ? 90 : isLargeDevice ? 130 : 110),
      left: 0,
      right: 0,
      padding: baseSpacing,
    },
    bottomContent: {
      position: 'absolute',
      bottom: contentSpacing,
      left: 0,
      right: 0,
      padding: baseSpacing,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'baseline',
      marginBottom: 8,
    },
    title: {
      fontSize: isSmallDevice ? 20 : isLargeDevice ? 28 : 24,
      fontWeight: 'bold',
      color: '#fff',
      flex: 1,
    },
    year: {
      fontSize: isSmallDevice ? 16 : isLargeDevice ? 20 : 18,
      color: '#fff',
      opacity: 0.8,
      marginLeft: 8,
    },
    ratingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: -15,
    },
    rating: {
      fontSize: isSmallDevice ? 14 : isLargeDevice ? 18 : 16,
      color: '#fff',
      marginLeft: 4,
      fontWeight: '600',
    },
    voteCount: {
      fontSize: isSmallDevice ? 12 : isLargeDevice ? 16 : 14,
      color: '#fff',
      opacity: 0.7,
      marginLeft: 4,
    },
    overview: {
      fontSize: isSmallDevice ? 12 : isLargeDevice ? 16 : 14,
      color: '#fff',
      lineHeight: isSmallDevice ? 18 : isLargeDevice ? 22 : 20,
      marginTop: 8,
      marginBottom: 12,
    },
    genreContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    genreLabel: {
      fontSize: isSmallDevice ? 12 : isLargeDevice ? 16 : 14,
      color: '#fff',
      fontWeight: '600',
      marginRight: 8,
    },
    genres: {
      fontSize: isSmallDevice ? 12 : isLargeDevice ? 16 : 14,
      color: '#fff',
      opacity: 0.8,
      flex: 1,
    },
    likeIndicator: {
      position: 'absolute',
      top: 50,
      right: 20,
      backgroundColor: '#4CAF50',
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 20,
      transform: [{ rotate: '15deg' }],
    },
    likeText: {
      color: '#fff',
      fontSize: 18,
      fontWeight: 'bold',
    },
    nopeIndicator: {
      position: 'absolute',
      top: 50,
      left: 20,
      backgroundColor: '#F44336',
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 20,
      transform: [{ rotate: '-15deg' }],
    },
    nopeText: {
      color: '#fff',
      fontSize: 18,
      fontWeight: 'bold',
    },
    actionButtons: {
      position: 'absolute',
      bottom: buttonSpacing,
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingHorizontal: baseSpacing * 2,
      zIndex: 1000,
    },
    actionButton: {
      width: isSmallDevice ? 50 : isLargeDevice ? 70 : 60,
      height: isSmallDevice ? 50 : isLargeDevice ? 70 : 60,
      borderRadius: isSmallDevice ? 25 : isLargeDevice ? 35 : 30,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    dislikeButton: {
      backgroundColor: '#F44336',
    },
    likeButton: {
      backgroundColor: '#4CAF50',
    },
    typeBadge: { marginLeft: 8, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
    typeText: { fontSize: isSmallDevice ? 10 : isLargeDevice ? 12 : 11, fontWeight: '600', color: '#fff' },

    infoHint: {
      position: 'absolute',
      top: isSmallDevice ? 10 : isLargeDevice ? 18 : 14,
      right: isSmallDevice ? 10 : isLargeDevice ? 18 : 14,
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.35)',
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: 12,
      zIndex: 5,
    },
    infoHintIconRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 2,
    },
    infoHintText: {
      color: '#fff',
      fontSize: isSmallDevice ? 9 : isLargeDevice ? 11 : 10,
      fontWeight: '600',
      opacity: 0.9,
    },
    backFace: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#1f1f1f',
      borderRadius: 20,
      padding: 20,
      justifyContent: 'flex-start',
      alignItems: 'stretch',
      backfaceVisibility: 'hidden',
    },
    backContent: {
      flex: 1,
      paddingTop: 60,
      paddingHorizontal: 20,
      paddingBottom: 32,
    },
    backTitle: {
      color: '#fff',
      fontSize: isSmallDevice ? 20 : isLargeDevice ? 28 : 24,
      fontWeight: 'bold',
      marginBottom: 8,
    },
    backYear: {
      color: '#bbb',
      fontSize: isSmallDevice ? 16 : isLargeDevice ? 20 : 18,
      fontWeight: '600',
    },
    backHeader: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 8,
      marginBottom: 8,
    },
    backMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 6,
    },
    backMetaItem: {
      color: '#ccc',
      fontSize: isSmallDevice ? 12 : isLargeDevice ? 16 : 14,
    },
    backMetaText: {
      color: '#ddd',
      fontSize: isSmallDevice ? 12 : isLargeDevice ? 16 : 14,
    },
    backDivider: {
      height: 1,
      backgroundColor: '#333',
      marginVertical: 12,
    },
    backOverview: {
      color: '#eee',
      fontSize: isSmallDevice ? 12 : isLargeDevice ? 16 : 14,
      lineHeight: isSmallDevice ? 18 : isLargeDevice ? 22 : 20,
    },
    backHint: {
      color: '#aaa',
      textAlign: 'center',
      marginTop: 16,
      fontSize: isSmallDevice ? 12 : isLargeDevice ? 16 : 14,
    },
    backHintContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
    },
    frontFace: {
      backfaceVisibility: 'hidden',
    },
  });

  /**
   * Handle swipe right gesture (Like action)
   * 
   * Animates the card off-screen to the right with spring animation and rotation,
   * then calls the onSwipeRight callback to notify the parent component.
   */
  const swipeRight = () => {
    console.log('swipeRight called');
    if (isFlipped) {
      console.log('Card is flipped, ignoring swipe');
      return;
    }
    Animated.parallel([
      Animated.spring(dragX, {
        toValue: screenWidth,
        stiffness: 220,
        damping: 24,
        mass: 0.9,
        useNativeDriver: false,
      }),
      Animated.spring(rotation, {
        toValue: 15,
        stiffness: 220,
        damping: 24,
        mass: 0.9,
        useNativeDriver: false,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 260,
        useNativeDriver: false,
      }),
    ]).start(() => {
      console.log('swipeRight animation completed, calling onSwipeRight');
      onSwipeRight();
      // Don't reset the card - let the parent component handle the transition
    });
  };

  const swipeLeft = () => {
    console.log('swipeLeft called');
    if (isFlipped) {
      console.log('Card is flipped, ignoring swipe');
      return;
    }
    Animated.parallel([
      Animated.spring(dragX, {
        toValue: -screenWidth,
        stiffness: 220,
        damping: 24,
        mass: 0.9,
        useNativeDriver: false,
      }),
      Animated.spring(rotation, {
        toValue: -15,
        stiffness: 220,
        damping: 24,
        mass: 0.9,
        useNativeDriver: false,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 260,
        useNativeDriver: false,
      }),
    ]).start(() => {
      console.log('swipeLeft animation completed, calling onSwipeLeft');
      onSwipeLeft();
      // Don't reset the card - let the parent component handle the transition
    });
  };

  const returnToCenter = () => {
    Animated.parallel([
      Animated.spring(dragX, {
        toValue: 0,
        useNativeDriver: false,
      }),
      Animated.spring(dragY, {
        toValue: 0,
        useNativeDriver: false,
      }),
      Animated.spring(rotation, {
        toValue: 0,
        useNativeDriver: false,
      }),
    ]).start();
  };

  // PanResponder for web - recreate when isTopCard changes
  const panResponder = useMemo(() => 
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => {
        console.log('onStartShouldSetPanResponder called, isTopCard:', isTopCard, 'isFlipped:', isFlipped);
        if (isFlipped) return false;
        if (!isTopCard) return false;
        
        // Check if touch is on action buttons (bottom 80px of card)
        const { locationY } = evt.nativeEvent;
        const isOnButtons = locationY > cardHeight - 80;
        
        return !isOnButtons;
      },
      onMoveShouldSetPanResponder: () => {
        console.log('onMoveShouldSetPanResponder called, isTopCard:', isTopCard, 'isFlipped:', isFlipped);
        return isTopCard && !isFlipped;
      },
      onPanResponderGrant: () => {
        console.log('Pan responder granted for card:', 'title' in item ? item.title : item.name);
      },
      onPanResponderMove: (_, gestureState) => {
        if (isTopCard) {
          dragX.setValue(gestureState.dx);
          dragY.setValue(gestureState.dy);
          rotation.setValue(gestureState.dx / screenWidth * 15);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (!isTopCard) {
          console.log('Pan responder release ignored - not top card');
          return;
        }
        
        console.log('Pan responder release:', gestureState);
        const { dx, vx } = gestureState;
        const swipeThreshold = screenWidth * 0.3;
        const velocityThreshold = 500;

        if (dx > swipeThreshold || vx > velocityThreshold) {
          // Swipe right - Like
          console.log('Swipe right detected');
          swipeRight();
        } else if (dx < -swipeThreshold || vx < -velocityThreshold) {
          // Swipe left - Dislike
          console.log('Swipe left detected');
          swipeLeft();
        } else {
          // Return to center
          console.log('Returning to center');
          returnToCenter();
        }
      },
    }), [isTopCard, isFlipped, cardHeight, screenWidth, swipeRight, swipeLeft, returnToCenter, item]
  );

  // PanGestureHandler for mobile
  const onGestureEvent = Animated.event(
    [
      { 
        nativeEvent: { 
          translationX: dragX, 
          translationY: dragY 
        } 
      }
    ],
    { 
      useNativeDriver: false,
      listener: (event: any) => {
        if (isTopCard && !isFlipped) {
          const translationX = event.nativeEvent.translationX;
          rotation.setValue(translationX / screenWidth * 15);
        }
      }
    }
  );

  /**
   * Handle gesture state changes for swipe detection
   * 
   * This function is called when the user finishes a gesture (pan gesture).
   * It determines whether the user swiped left, right, or just tapped based on
   * the translation distance and velocity of the gesture.
   * 
   * @param event - Gesture event containing translation and velocity data
   */
  const onHandlerStateChange = (event: any) => {
    console.log('onHandlerStateChange called, isTopCard:', isTopCard, 'isFlipped:', isFlipped, 'state:', event.nativeEvent.state);
    if (!isTopCard || isFlipped) {
      console.log('onHandlerStateChange ignored - not top card or flipped');
      return;
    }
    
    if (event.nativeEvent.state === State.END) {
      const { translationX, velocityX } = event.nativeEvent;
      const swipeThreshold = screenWidth * 0.3; // 30% of screen width
      const velocityThreshold = 500; // Minimum velocity for quick swipes

      if (translationX > swipeThreshold || velocityX > velocityThreshold) {
        // Swipe right - Like
        console.log('Swipe right detected (mobile)');
        swipeRight();
      } else if (translationX < -swipeThreshold || velocityX < -velocityThreshold) {
        // Swipe left - Dislike
        console.log('Swipe left detected (mobile)');
        swipeLeft();
      } else {
        // Return to center
        console.log('Returning to center (mobile)');
        returnToCenter();
      }
    }
  };

  const resetCard = () => {
    // Reset all animated values to initial state
    dragX.setValue(0);
    dragY.setValue(0);
    rotation.setValue(0);
    scale.setValue(1);
    opacity.setValue(1);
    flip.setValue(0);
    
    // Stop any running animations
    dragX.stopAnimation();
    dragY.stopAnimation();
    rotation.stopAnimation();
    scale.stopAnimation();
    opacity.stopAnimation();
    flip.stopAnimation();
    
    // Reset flip state
    setIsFlipped(false);
  };

  const rotateInterpolate = rotation.interpolate({
    inputRange: [-15, 0, 15],
    outputRange: ['-15deg', '0deg', '15deg'],
    extrapolate: 'clamp',
  });

  const likeOpacity = dragX.interpolate({
    inputRange: [0, screenWidth * 0.3],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const nopeOpacity = dragX.interpolate({
    inputRange: [-screenWidth * 0.3, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const posterUrl = movieApi.getImageUrl(item.poster_path, 'original');
  const backdropUrl = movieApi.getBackdropUrl(item.backdrop_path, 'original');
  
  // Debug logging
  console.log('Movie item:', isMovie ? item.title : item.name);
  console.log('Poster path:', item.poster_path);
  console.log('Backdrop path:', item.backdrop_path);
  console.log('Poster URL:', posterUrl);
  console.log('Backdrop URL:', backdropUrl);

  const [genreNames, setGenreNames] = React.useState<string[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const names = await movieApi.mapGenreIdsToNames(item.genre_ids.slice(0, 3));
        if (!cancelled) setGenreNames(names);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [item.genre_ids]);

  const frontRotateY = flip.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });
  const backRotateY = flip.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });

  const toggleFlip = () => {
    Animated.timing(flip, {
      toValue: isFlipped ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start(() => setIsFlipped(!isFlipped));
  };

  const cardInner = (
    <TouchableWithoutFeedback onPress={toggleFlip}>
      <View style={{ width: CARD_WIDTH, height: cardHeight }}>
        <Animated.View
          style={[
            styles.card,
            styles.frontFace,
            { width: CARD_WIDTH, height: cardHeight },
            {
              transform: [
                { perspective: 1000 },
                { rotateY: frontRotateY },
                { translateX: dragX },
                { translateY: dragY },
                { rotateZ: rotateInterpolate },
                { scale },
              ],
              opacity,
            },
          ]}
        >
        <Image
          source={{ uri: backdropUrl || posterUrl }}
          style={styles.backgroundImage}
          resizeMode="cover"
          onError={(error) => console.log('Image load error:', error.nativeEvent.error)}
          onLoad={() => console.log('Image loaded successfully')}
        />
        
        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,1)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.gradient}
        />

        <View style={styles.infoHint}>
          <View style={styles.infoHintIconRow}>
            <Ionicons name="return-up-forward-outline" size={16} color="#fff" style={{ marginLeft: 4, opacity: 0.9 }} />
          </View>
          <Text style={styles.infoHintText}>Tap to show info</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.year}>({year})</Text>
            <View style={[styles.typeBadge, { backgroundColor: isMovie ? '#007AFF' : '#34C759' }]}>
              <Text style={styles.typeText}>{isMovie ? 'Movie' : 'TV Show'}</Text>
            </View>
          </View>

          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={16} color="#FFD700" />
            <Text style={styles.rating}>{item.vote_average.toFixed(1)}</Text>
            <Text style={styles.voteCount}>({item.vote_count} votes)</Text>
          </View>
        </View>

        <View style={styles.bottomContent}>
          <Text style={styles.overview} numberOfLines={3}>
            {item.overview}
          </Text>

          <View style={styles.genreContainer}>
            <Text style={styles.genreLabel}>Genres:</Text>
            <Text style={styles.genres}>
              {genreNames.join(', ')}
            </Text>
          </View>
        </View>

        {/* Like/Nope indicators */}
        <Animated.View style={[styles.likeIndicator, { opacity: likeOpacity }]}>
          <Text style={styles.likeText}>LIKE</Text>
        </Animated.View>

        <Animated.View style={[styles.nopeIndicator, { opacity: nopeOpacity }]}>
          <Text style={styles.nopeText}>NOPE</Text>
        </Animated.View>

        {/* Action buttons - only show for top card and not flipped */}
        {isTopCard && !isFlipped && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.dislikeButton]}
              onPress={() => {
                console.log('Dislike button pressed');
                swipeLeft();
              }}
              disabled={!isTopCard}
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.likeButton]}
              onPress={() => {
                console.log('Like button pressed');
                swipeRight();
              }}
              disabled={!isTopCard}
            >
              <Ionicons name="heart" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
        </Animated.View>

        <Animated.View
          style={[
            styles.card,
            styles.backFace,
            { width: CARD_WIDTH, height: cardHeight },
            { transform: [{ perspective: 1000 }, { rotateY: backRotateY }] },
          ]}
        >
                        <View style={styles.backContent}>
              <View style={styles.backHeader}>
                <Text style={styles.backTitle}>{title}</Text>
                <Text style={styles.backYear}>({year})</Text>
                <View style={[styles.typeBadge, { backgroundColor: isMovie ? '#007AFF' : '#34C759' }]}>
                  <Text style={styles.typeText}>{isMovie ? 'Movie' : 'TV Show'}</Text>
                </View>
              </View>
              <View style={styles.backMetaRow}>
                <Ionicons name="star" size={16} color="#FFD700" />
                <Text style={styles.backMetaText}>{item.vote_average.toFixed(1)} · {item.vote_count} votes</Text>
              </View>
            <View style={styles.backMetaRow}>
              <Text style={styles.backMetaText}>Language: {item.original_language.toUpperCase()}</Text>
            </View>
            <View style={styles.backMetaRow}>
              <Text style={styles.backMetaText}>Genres: {genreNames.join(', ') || '—'}</Text>
            </View>
            <View style={styles.backDivider} />
            <Text style={styles.backOverview}>{item.overview || 'No description available.'}</Text>
            <View style={styles.backHintContainer}>
              <Text style={styles.backHint}>Tap to flip back</Text>
              <Ionicons name="return-up-back-outline" size={18} color="#fff" style={{ marginTop: 6, opacity: 0.9 }} />
            </View>
          </View>
        </Animated.View>
      </View>
    </TouchableWithoutFeedback>
  );

  return (
    <View style={[
      styles.cardContainer,
      { width: CARD_WIDTH, height: cardHeight },
      isNextCard && styles.nextCardContainer,
      isThirdCard && styles.thirdCardContainer,
      isFourthCard && styles.fourthCardContainer,
      isFifthCard && styles.fifthCardContainer,
      { zIndex: isTopCard ? 4 : isNextCard ? 3 : isThirdCard ? 2 : isFourthCard ? 1 : 0 }
    ]}>
      {Platform.OS === 'web' ? (
        <View {...panResponder.panHandlers}>
          {cardInner}
        </View>
      ) : (
        <PanGestureHandler
          onGestureEvent={onGestureEvent}
          onHandlerStateChange={onHandlerStateChange}
          enabled={isTopCard && !isFlipped}
          shouldCancelWhenOutside={false}
        >
          <View collapsable={false}>
            {cardInner}
          </View>
        </PanGestureHandler>
      )}
    </View>
  );
}
