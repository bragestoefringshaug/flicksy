/**
 * Authentication Context
 * 
 * Provides authentication state and methods throughout the app.
 * Manages user login, registration, logout, and preference updates.
 * Uses Firebase Authentication for user management and Firebase Realtime Database for data storage.
 * 
 * @author Flicksy Team
 * @version 2.0.0
 */

import {
    createUserWithEmailAndPassword,
    User as FirebaseUser,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut
} from 'firebase/auth';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../services/firebase';
import { createUser, getUser, updateUserPreferences } from '../services/firebaseDb';

/**
 * User interface defining the structure of user data
 */
interface User {
  id: string; // Firebase UID
  email: string; // User's email address
  name: string; // User's display name
  preferences: {
    genres: string[]; // User's preferred genres
    likedMovies: number[]; // Array of liked movie IDs
    dislikedMovies: number[]; // Array of disliked movie IDs
    watchlist: number[]; // Array of watchlist movie/TV show IDs
    seen: number[]; // Array of seen movie/TV show IDs
    streamingServices: string[]; // User's selected streaming services
  };
}

/**
 * Authentication context type defining available methods and state
 */
interface AuthContextType {
  user: User | null; // Current user or null if not logged in
  isLoading: boolean; // Loading state for authentication operations
  login: (email: string, password: string) => Promise<boolean>; // Login method
  register: (email: string, password: string, name: string) => Promise<boolean>; // Registration method
  logout: () => Promise<void>; // Logout method
  updatePreferences: (preferences: Partial<User['preferences']>) => Promise<void>; // Update user preferences
}

// Create the authentication context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Custom hook to use the authentication context
 * 
 * @returns AuthContextType - The authentication context value
 * @throws Error if used outside of AuthProvider
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * AuthProvider Component
 * 
 * Provides authentication context to all child components.
 * Manages user state, authentication methods, and persistent storage.
 * 
 * @param children - React children components
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // ==================== STATE ====================
  
  const [user, setUser] = useState<User | null>(null); // Current user state
  const [isLoading, setIsLoading] = useState(true); // Loading state for auth operations

  // ==================== EFFECTS ====================
  
  /**
   * Listen to Firebase authentication state changes
   */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // User is signed in, get their data from Firebase Realtime Database
        try {
          const userData = await getUser(firebaseUser.uid);
          if (userData) {
            setUser({
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: userData.name || '',
              preferences: userData.preferences
            });
          }
        } catch (error) {
          console.error('Error loading user data:', error);
        }
      } else {
        // User is signed out
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const register = async (email: string, password: string, name: string): Promise<boolean> => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Create user document in Firebase Realtime Database
      await createUser(firebaseUser.uid, {
        email,
        name,
        preferences: {
          genres: [],
          likedMovies: [],
          dislikedMovies: [],
          watchlist: [],
          seen: [],
          streamingServices: [],
        }
      });
      
      return true;
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updatePreferences = async (preferences: Partial<User['preferences']>) => {
    if (!user) return;

    try {
      // Update preferences in Firebase Realtime Database
      await updateUserPreferences(user.id, preferences);
      
      // Update local state
      const updatedUser = {
        ...user,
        preferences: { ...user.preferences, ...preferences },
      };
      setUser(updatedUser);
    } catch (error) {
      console.error('Error updating preferences:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, updatePreferences }}>
      {children}
    </AuthContext.Provider>
  );
};
