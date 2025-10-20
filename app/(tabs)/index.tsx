import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import LoginScreen from '../../screens/LoginScreen';
import RegisterScreen from '../../screens/RegisterScreen';
import SwipeScreen from '../../screens/SwipeScreen';
import StreamingServicesScreen from '../../screens/StreamingServices';
import GenreSelection from '../../screens/GenreSelection';

export default function HomeScreen() {
  const { user, isLoading } = useAuth();
  const [showRegister, setShowRegister] = useState(false);

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3A5683" />
        <ThemedText style={styles.loadingText}>Loading...</ThemedText>
      </ThemedView>
    );
  }

  if (!user) {
    return showRegister ? (
      <RegisterScreen onSwitchToLogin={() => setShowRegister(false)} />
    ) : (
      <LoginScreen onSwitchToRegister={() => setShowRegister(true)} />
    );
  }

  const needsGenres = !user.preferences?.genres || user.preferences.genres.length === 0;
  const needsStreamingServices = !user.preferences?.streamingServices || user.preferences.streamingServices.length === 0;

  if (needsStreamingServices) {
    return <StreamingServicesScreen />;
  }

  if (needsGenres) {
    return <GenreSelection />;
  }

  return <SwipeScreen />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#000000', // Black text on primary background
  },
});
