import { get, ref, remove, set, update } from 'firebase/database';
import { database } from './firebase';

/**
 * Movie metadata interface for ML purposes
 */
export interface MovieMetadata {
  title: string;
  genres: number[]; // TMDB genre IDs
  releaseYear: number;
  popularity: number;
  isMovie: boolean; // true for movies, false for TV shows
}

/**
 * Movie interaction interface for ML purposes
 */
export interface MovieInteraction {
  movieId: number;
  action: 'liked' | 'disliked' | 'watchlisted' | 'seen';
  timestamp: number;
  movieMetadata: MovieMetadata;
}

/**
 * Aggregated movie interaction data for ML
 */
export interface MovieInteractionAggregate {
  totalLikes: number;
  totalDislikes: number;
  totalWatchlists: number;
  totalSeen: number;
  userIds: string[]; // For collaborative filtering
}

/**
 * User interface for Firebase database operations
 */
export interface FirebaseUser {
  uid: string;
  email: string;
  name: string;
  preferences: {
    genres: string[];
    likedMovies: number[];
    dislikedMovies: number[];
    watchlist: number[];
    seen: number[];
    streamingServices: string[];
  };
  apiKeys: Record<string, string>;
  createdAt: number;
}

/**
 * Create a new user in Firebase Realtime Database
 */
export async function createUser(uid: string, userData: Partial<FirebaseUser>): Promise<void> {
  const userRef = ref(database, `users/${uid}`);
  const user: FirebaseUser = {
    uid,
    email: userData.email || '',
    name: userData.name || '',
    preferences: {
      genres: [],
      likedMovies: [],
      dislikedMovies: [],
      watchlist: [],
      seen: [],
      streamingServices: [],
      ...userData.preferences
    },
    apiKeys: {},
    createdAt: Date.now(),
    ...userData
  };
  
  await set(userRef, user);
}

/**
 * Get user data from Firebase Realtime Database
 */
export async function getUser(uid: string): Promise<FirebaseUser | null> {
  const userRef = ref(database, `users/${uid}`);
  const snapshot = await get(userRef);
  
  if (snapshot.exists()) {
    return snapshot.val() as FirebaseUser;
  }
  
  return null;
}

/**
 * Update user preferences in Firebase Realtime Database
 */
export async function updateUserPreferences(uid: string, preferences: Partial<FirebaseUser['preferences']>): Promise<void> {
  const userRef = ref(database, `users/${uid}/preferences`);
  await update(userRef, preferences);
}

/**
 * Store an API key for a user
 */
export async function storeApiKey(uid: string, serviceName: string, apiKey: string): Promise<void> {
  const apiKeyRef = ref(database, `users/${uid}/apiKeys/${serviceName}`);
  await set(apiKeyRef, apiKey);
}

/**
 * Get an API key for a user
 */
export async function getApiKey(uid: string, serviceName: string): Promise<string | null> {
  const apiKeyRef = ref(database, `users/${uid}/apiKeys/${serviceName}`);
  const snapshot = await get(apiKeyRef);
  
  if (snapshot.exists()) {
    return snapshot.val() as string;
  }
  
  return null;
}

/**
 * Update user data (general update function)
 */
export async function updateUser(uid: string, updates: Partial<FirebaseUser>): Promise<void> {
  const userRef = ref(database, `users/${uid}`);
  await update(userRef, updates);
}

/**
 * Delete user data
 */
export async function deleteUser(uid: string): Promise<void> {
  const userRef = ref(database, `users/${uid}`);
  await remove(userRef);
}

// ==================== ML INTERACTION FUNCTIONS ====================

/**
 * Generate a composite key to differentiate movies and TV shows
 * Format: "movie_123" or "tv_456"
 */
export function generateInteractionKey(movieId: number, isMovie: boolean): string {
  return `${isMovie ? 'movie' : 'tv'}_${movieId}`;
}

/**
 * Parse a composite key to extract ID and type
 * Returns: { id: number, isMovie: boolean }
 */
export function parseInteractionKey(key: string): { id: number; isMovie: boolean } {
  const [type, idStr] = key.split('_');
  return {
    id: parseInt(idStr, 10),
    isMovie: type === 'movie'
  };
}

/**
 * Record a movie interaction for ML purposes
 */
export async function recordInteraction(uid: string, interaction: MovieInteraction): Promise<void> {
  const compositeKey = generateInteractionKey(interaction.movieId, interaction.movieMetadata.isMovie);
  const interactionRef = ref(database, `users/${uid}/interactions/${compositeKey}`);
  await set(interactionRef, interaction);
  
  // Also update aggregated movie data for ML
  await updateMovieAggregates(interaction.movieId, interaction.movieMetadata.isMovie, interaction.action, uid);
}

/**
 * Get all interactions for a user
 */
export async function getUserInteractions(uid: string): Promise<MovieInteraction[]> {
  const interactionsRef = ref(database, `users/${uid}/interactions`);
  const snapshot = await get(interactionsRef);
  
  if (snapshot.exists()) {
    const interactions = snapshot.val() as Record<string, MovieInteraction>;
    return Object.values(interactions);
  }
  
  return [];
}

/**
 * Get interactions for a specific movie/TV show across all users
 */
export async function getMovieInteractions(movieId: number, isMovie: boolean): Promise<MovieInteractionAggregate | null> {
  const compositeKey = generateInteractionKey(movieId, isMovie);
  const movieRef = ref(database, `movieInteractions/${compositeKey}`);
  const snapshot = await get(movieRef);
  
  if (snapshot.exists()) {
    return snapshot.val() as MovieInteractionAggregate;
  }
  
  return null;
}

/**
 * Update aggregated movie interaction data for ML
 */
export async function updateMovieAggregates(movieId: number, isMovie: boolean, action: string, uid: string): Promise<void> {
  const compositeKey = generateInteractionKey(movieId, isMovie);
  const movieRef = ref(database, `movieInteractions/${compositeKey}`);
  const snapshot = await get(movieRef);
  
  let aggregate: MovieInteractionAggregate;
  
  if (snapshot.exists()) {
    aggregate = snapshot.val() as MovieInteractionAggregate;
  } else {
    aggregate = {
      totalLikes: 0,
      totalDislikes: 0,
      totalWatchlists: 0,
      totalSeen: 0,
      userIds: []
    };
  }
  
  // Update counts based on action
  switch (action) {
    case 'liked':
      aggregate.totalLikes++;
      break;
    case 'disliked':
      aggregate.totalDislikes++;
      break;
    case 'watchlisted':
      aggregate.totalWatchlists++;
      break;
    case 'seen':
      aggregate.totalSeen++;
      break;
  }
  
  // Add user to list if not already present
  if (!aggregate.userIds.includes(uid)) {
    aggregate.userIds.push(uid);
  }
  
  await set(movieRef, aggregate);
}

/**
 * Get user interactions filtered by action type
 */
export async function getUserInteractionsByAction(uid: string, action: 'liked' | 'disliked' | 'watchlisted' | 'seen'): Promise<MovieInteraction[]> {
  const interactions = await getUserInteractions(uid);
  return interactions.filter(interaction => interaction.action === action);
}

/**
 * Get recent interactions for a user (last N days)
 */
export async function getRecentUserInteractions(uid: string, days: number = 30): Promise<MovieInteraction[]> {
  const interactions = await getUserInteractions(uid);
  const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
  
  return interactions.filter(interaction => interaction.timestamp >= cutoffTime);
}
