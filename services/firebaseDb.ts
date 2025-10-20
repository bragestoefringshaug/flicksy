import { get, ref, remove, set, update } from 'firebase/database';
import { database } from './firebase';

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
