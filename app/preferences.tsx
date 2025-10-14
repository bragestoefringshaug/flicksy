import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useNavigation, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function PreferencesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({ title: 'Preferences' });
  }, [navigation]);

  const streamingCount = user?.preferences?.streamingServices?.length || 0;
  const genreCount = user?.preferences?.genres?.length || 0;

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title">Preferences</ThemedText>
        <ThemedText style={styles.subtitle}>Manage your app preferences</ThemedText>
      </View>

      <View style={styles.menuContainer}>
        <TouchableOpacity 
          style={styles.menuItem} 
          onPress={() => router.push('/streaming-services')}
        >
          <View style={styles.menuLeft}>
            <Ionicons name="tv-outline" size={24} color="#007AFF" />
            <View style={styles.menuTextContainer}>
              <ThemedText style={styles.menuTitle}>Streaming Services</ThemedText>
              <ThemedText style={styles.menuSubtitle}>
                {streamingCount > 0 ? `${streamingCount} selected` : 'Not set'}
              </ThemedText>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.menuItem} 
          onPress={() => router.push('/genre-selection' as any)}
        >
          <View style={styles.menuLeft}>
            <Ionicons name="film-outline" size={24} color="#007AFF" />
            <View style={styles.menuTextContainer}>
              <ThemedText style={styles.menuTitle}>Genres</ThemedText>
              <ThemedText style={styles.menuSubtitle}>
                {genreCount > 0 ? `${genreCount} selected` : 'Not set'}
              </ThemedText>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 30,
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 8,
  },
  menuContainer: {
    gap: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  menuSubtitle: {
    fontSize: 14,
    opacity: 0.6,
  },
});


