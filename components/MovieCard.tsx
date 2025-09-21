import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
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

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const CARD_WIDTH = screenWidth;

interface MovieCardProps {
  item: Movie | TVShow;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  isTopCard: boolean;
  isNextCard?: boolean;
  isThirdCard?: boolean;
  isFourthCard?: boolean;
  isFifthCard?: boolean;
}

export default function MovieCard({ item, onSwipeLeft, onSwipeRight, isTopCard, isNextCard = false, isThirdCard = false, isFourthCard = false, isFifthCard = false }: MovieCardProps) {
  const insets = useSafeAreaInsets();
  const cardHeight = Math.max(0, screenHeight);
  
  
  // Calculate responsive positioning based on device dimensions
  const isSmallDevice = screenHeight < 700;
  const isLargeDevice = screenHeight > 900;
  
  // Dynamic spacing based on device size
  const baseSpacing = isSmallDevice ? 15 : isLargeDevice ? 25 : 20;
  
  // Tab bar height estimation (varies by device)
  const tabBarHeight = isSmallDevice ? 60 : isLargeDevice ? 80 : 70;
  
  // Button positioning - above tab bar with safe area and extra padding
  const buttonSpacing = tabBarHeight + insets.bottom + (isSmallDevice ? 25 : isLargeDevice ? 35 : 30);
  
  // Content positioning - above buttons with proper spacing
  const contentSpacing = buttonSpacing + (isSmallDevice ? 70 : isLargeDevice ? 90 : 80);
  
  // Separate animated values for different purposes
  const dragX = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const rotation = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const flip = useRef(new Animated.Value(0)).current;
  const [isFlipped, setIsFlipped] = React.useState(false);

  // Reset card when it becomes the top card
  useEffect(() => {
    if (isTopCard) {
      resetCard();
    }
  }, [isTopCard]);

  const isMovie = 'title' in item;
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
      height: '45%',
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
    frontFace: {
      backfaceVisibility: 'hidden',
    },
  });

  // PanResponder for web
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => {
        if (isFlipped) return false;
        if (!isTopCard) return false;
        
        // Check if touch is on action buttons (bottom 80px of card)
        const { locationY } = evt.nativeEvent;
        const isOnButtons = locationY > cardHeight - 80;
        
        return !isOnButtons;
      },
      onMoveShouldSetPanResponder: () => isTopCard && !isFlipped,
      onPanResponderGrant: () => {
        console.log('Pan responder granted');
      },
      onPanResponderMove: (_, gestureState) => {
        if (isTopCard) {
          dragX.setValue(gestureState.dx);
          dragY.setValue(gestureState.dy);
          rotation.setValue(gestureState.dx / screenWidth * 15);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (!isTopCard) return;
        
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
    })
  ).current;

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

  const onHandlerStateChange = (event: any) => {
    if (!isTopCard || isFlipped) return;
    
    if (event.nativeEvent.state === State.END) {
      const { translationX, velocityX } = event.nativeEvent;
      const swipeThreshold = screenWidth * 0.3;
      const velocityThreshold = 500;

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
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.gradient}
        />

        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.year}>({year})</Text>
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
            <Text style={styles.backTitle}>{title} <Text style={styles.backYear}>({year})</Text></Text>
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
            <Text style={styles.backHint}>Tap to flip back</Text>
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
        >
          <View collapsable={false}>
            {cardInner}
          </View>
        </PanGestureHandler>
      )}
    </View>
  );
}
