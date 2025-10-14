import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ALL_GENRES } from '@/constants/Genres';
import { useNavigation, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useAuth } from '../../../contexts/AuthContext';

// Use shared genre list

export default function PreferencesScreen() {
  const { user, updatePreferences } = useAuth();
  const router = useRouter();
  const navigation = useNavigation();
  const initial = useMemo(() => new Set(user?.preferences.genres ?? []), [user?.preferences.genres]);
  const [selected, setSelected] = useState<Set<string>>(initial);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: 'Preferences' });
  }, [navigation]);

  const toggleGenre = (genre: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(genre)) next.delete(genre); else next.add(genre);
      return next;
    });
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await updatePreferences({ genres: Array.from(selected) });
      Alert.alert('Saved', 'Your preferences have been updated.');
      // Navigate to Discover tab after saving
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to save preferences');
    } finally {
      setIsSaving(false);
    }
  };

  const renderItem = ({ item }: { item: string }) => {
    const isSelected = selected.has(item);
    return (
      <Pressable onPress={() => toggleGenre(item)} style={[styles.chip, isSelected && styles.chipSelected]}>
        <ThemedText style={[styles.chipText, isSelected && styles.chipTextSelected]}>{item}</ThemedText>
      </Pressable>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title">Preferences</ThemedText>
        <Pressable onPress={handleSave} disabled={isSaving} style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}>
          <ThemedText style={styles.saveButtonText}>{isSaving ? 'Saving...' : 'Save'}</ThemedText>
        </Pressable>
      </View>
      <ThemedText type="subtitle" style={styles.sectionTitle}>Favorite genres</ThemedText>
      <FlatList
        data={ALL_GENRES}
        numColumns={2}
        keyExtractor={(g) => g}
        renderItem={renderItem}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    marginTop: 8,
    marginBottom: 4,
  },
  listContent: {
    paddingVertical: 8,
  },
  row: {
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 999,
    alignItems: 'center',
  },
  chipSelected: {
    backgroundColor: '#007AFF22',
    borderColor: '#007AFF',
  },
  chipText: {
    fontSize: 14,
  },
  chipTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});


