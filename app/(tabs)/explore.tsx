import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { router, type Href } from 'expo-router';
import {
    Alert,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will remove all your preferences and watchlist. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            // In a real app, you would implement this functionality
            Alert.alert('Info', 'This feature will be implemented in a future update.');
          },
        },
      ]
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person-circle" size={80} color="#007AFF" />
          </View>
          <ThemedText style={styles.name}>{user?.name || 'User'}</ThemedText>
          <ThemedText style={styles.email}>{user?.email}</ThemedText>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <ThemedText style={styles.statNumber}>{user?.preferences.likedMovies.length || 0}</ThemedText>
            <ThemedText style={styles.statLabel}>Liked</ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText style={styles.statNumber}>{user?.preferences.watchlist.length || 0}</ThemedText>
            <ThemedText style={styles.statLabel}>Watchlist</ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText style={styles.statNumber}>{user?.preferences.dislikedMovies.length || 0}</ThemedText>
            <ThemedText style={styles.statLabel}>Disliked</ThemedText>
          </View>
        </View>

        <View style={styles.menuContainer}>

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(tabs)/preferences')}>
            <Ionicons name="list-outline" size={24} color="#666" />
            <ThemedText style={styles.menuText}>Preferences</ThemedText>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>

          {/* Settings -> open the Streaming Services screen so users can update preferences later */}
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/streaming-services' as Href)}>

            <Ionicons name="settings-outline" size={24} color="#666" />
            <ThemedText style={styles.menuText}>Settings</ThemedText>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="notifications-outline" size={24} color="#666" />
            <ThemedText style={styles.menuText}>Notifications</ThemedText>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="help-circle-outline" size={24} color="#666" />
            <ThemedText style={styles.menuText}>Help & Support</ThemedText>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleClearData}>
            <Ionicons name="trash-outline" size={24} color="#F44336" />
            <ThemedText style={[styles.menuText, { color: '#F44336' }]}>Clear All Data</ThemedText>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, styles.logoutItem]} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#F44336" />
            <ThemedText style={[styles.menuText, { color: '#F44336' }]}>Logout</ThemedText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  menuContainer: {
    paddingTop: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
  },
  menuText: {
    fontSize: 16,
    marginLeft: 16,
    flex: 1,
  },
  logoutItem: {
    borderBottomWidth: 0,
  },
});
