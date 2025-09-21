import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  preferences: {
    genres: string[];
    likedMovies: number[];
    dislikedMovies: number[];
    watchlist: number[];
  };
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updatePreferences: (preferences: Partial<User['preferences']>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

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
