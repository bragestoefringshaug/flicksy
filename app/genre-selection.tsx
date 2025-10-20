import React from 'react';
import { Stack } from 'expo-router';
import GenreSelection from '@/screens/GenreSelection';

export default function GenreSelectionRoute() {
  return (
    <>
      <Stack.Screen options={{ title: 'Select Genres' }} />
      <GenreSelection />
    </>
  );
}

