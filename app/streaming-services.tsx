import React from 'react';
import { Stack } from 'expo-router';
import StreamingServices from '../screens/StreamingServices';

// Route entry for the Streaming Services screen.
// This lets us navigate to the preferences screen from multiple places
// (e.g., right after registration and later from Settings/Profile).

export default function StreamingServicesRoute() {
  return (
    <>
      {/* Provide a page title in the native navigation bar */}
      <Stack.Screen options={{ title: 'Streaming Services' }} />
      <StreamingServices />
    </>
  );
}


