/**
 * Authentication Context
 * 
 * Provides authentication state and methods throughout the app.
 * Manages user login, registration, logout, and preference updates.
 * Uses AsyncStorage for persistent user session management.
 * 
 * @author Flicksy Team
 * @version 1.0.0
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

/**
 * User interface defining the structure of user data
 */
interface User {
  id: string; // Unique user identifier
  email: string; // User's email address
  name: string; // User's display name
  preferences: {
    genres: string[]; // User's preferred genres
    likedMovies: number[]; // Array of liked movie IDs
    dislikedMovies: number[]; // Array of disliked movie IDs
    watchlist: number[]; // Array of watchlist movie/TV show IDs
    streamingServices?: string[]; // User's selected streaming services
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
   * Load user data from AsyncStorage on component mount
   */
  useEffect(() => {
    loadUser();
  }, []);

  // ==================== AUTHENTICATION METHODS ====================
  
  /**
   * Load user data from persistent storage
   * 
   * Attempts to retrieve and parse user data from AsyncStorage.
   * Sets loading state to false when complete.
   */
  const loadUser = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      // In a real app, this would make an API call
      // For now, we'll simulate authentication
      const userData = await AsyncStorage.getItem(`user_${email}`);
      if (userData) {
        const user = JSON.parse(userData);
        if (user.password === password) {
          delete user.password; // Remove password from stored user object
          setUser(user);
          await AsyncStorage.setItem('user', JSON.stringify(user));
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const register = async (email: string, password: string, name: string): Promise<boolean> => {
    try {
      // Check if user already exists
      const existingUser = await AsyncStorage.getItem(`user_${email}`);
      if (existingUser) {
        return false;
      }

      const newUser: User = {
        id: Date.now().toString(),
        email,
        name,
        preferences: {
          genres: [],
          likedMovies: [],
          dislikedMovies: [],
          watchlist: [],
          streamingServices: [],
        },
      };

      // Store user with password for login simulation
      await AsyncStorage.setItem(`user_${email}`, JSON.stringify({ ...newUser, password }));
      
      setUser(newUser);
      await AsyncStorage.setItem('user', JSON.stringify(newUser));
      return true;
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('user');
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updatePreferences = async (preferences: Partial<User['preferences']>) => {
    if (!user) return;

    const updatedUser = {
      ...user,
      preferences: { ...user.preferences, ...preferences },
    };

    try {
      setUser(updatedUser);
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      // Also update the user data with password
      const userWithPassword = await AsyncStorage.getItem(`user_${user.email}`);
      if (userWithPassword) {
        const userData = JSON.parse(userWithPassword);
        await AsyncStorage.setItem(`user_${user.email}`, JSON.stringify({ ...userData, preferences: updatedUser.preferences }));
      }
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
