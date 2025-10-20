/**
 * StreamingServices Screen
 *
 * Lets users select which services they have.
 * We keep the UI selection in sync with `user.preferences.streamingServices`
 * so the screen works both during onboarding and later from Settings.
 */
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import { useAuth } from '../contexts/AuthContext';

type ServiceKey = 'Netflix' | 'Viaplay' | 'Disney+' | 'Prime Video' | 'HBO Max' | 'Apple TV';

const ALL_SERVICES: { key: ServiceKey; label: string }[] = [
  { key: 'Netflix', label: 'Netflix' },
  { key: 'Viaplay', label: 'Viaplay' },
  { key: 'Disney+', label: 'Disney+' },
  { key: 'Prime Video', label: 'Prime Video' },
  { key: 'HBO Max', label: 'HBO Max' },
  { key: 'Apple TV', label: 'Apple TV' },
];

export default function StreamingServices() {
  const { user, updatePreferences } = useAuth();

  // Keep a Set for quick toggle checks and to avoid duplicates
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  // When user preferences change (e.g., on login or external update),
  // update our local selection to match.
  React.useEffect(() => {
    const existing = user?.preferences?.streamingServices ?? [];
    setSelected(new Set(existing));
  }, [user?.preferences?.streamingServices]);

  const toggle = (key: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updatePreferences({ streamingServices: Array.from(selected) });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>Choose your streaming services</ThemedText>
        <ThemedText style={styles.subtitle}>Select all that apply to personalize availability</ThemedText>
      </View>

      <ScrollView contentContainerStyle={styles.listContainer}>
        <View style={styles.grid}>
          {ALL_SERVICES.map(({ key, label }) => {
            const isSelected = selected.has(key);
            return (
              <TouchableOpacity
                key={key}
                style={[styles.card, isSelected && styles.cardSelected]}
                activeOpacity={0.8}
                onPress={() => toggle(key)}
              >
                <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                  {isSelected && <Text style={styles.checkboxTick}>✓</Text>}
                </View>
                <ThemedText style={[styles.cardLabel, isSelected && styles.cardLabelSelected]}>{label}</ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          onPress={handleSave}
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          disabled={isSaving}
        >
          <Text style={styles.saveButtonText}>{isSaving ? 'Saving…' : 'Save Preferences'}</Text>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 12,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
    marginTop: 6,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#3A5683', // Secondary color for border
    borderRadius: 14,
    padding: 16,
    backgroundColor: '#FFFFFF', // Tertiary color for background
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardSelected: {
    borderColor: '#3A5683',
    backgroundColor: '#3A5683', // Secondary color for selected background
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#3A5683', // Secondary color for border
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF', // Tertiary color for background
  },
  checkboxSelected: {
    borderColor: '#FFFFFF', // White border on secondary background
    backgroundColor: '#FFFFFF', // White background for checkmark
  },
  checkboxTick: {
    color: '#3A5683', // Secondary color for checkmark
    fontWeight: 'bold',
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000', // Black text on tertiary background
  },
  cardLabelSelected: {
    color: '#FFFFFF', // White text when card is selected (secondary background)
  },
  footer: {
    padding: 20,
  },
  saveButton: {
    backgroundColor: '#3A5683', // Secondary color for button
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#9EC6FF',
  },
  saveButtonText: {
    color: '#FFFFFF', // White text on secondary color
    fontSize: 16,
    fontWeight: '600',
  },
});
