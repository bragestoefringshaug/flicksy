// Load environment variables from .env file
import { readFileSync } from 'fs';
import { join } from 'path';

let tmdbApiKey = process.env.EXPO_PUBLIC_TMDB_API_KEY;

// Try to load from .env file if not in process.env
if (!tmdbApiKey) {
  try {
    const envPath = join(__dirname, '.env');
    const envFile = readFileSync(envPath, 'utf8');
    
    envFile.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const equalIndex = trimmedLine.indexOf('=');
        if (equalIndex > 0) {
          const key = trimmedLine.substring(0, equalIndex).trim();
          const value = trimmedLine.substring(equalIndex + 1).trim();
          if (key === 'EXPO_PUBLIC_TMDB_API_KEY') {
            tmdbApiKey = value.replace(/^["']|["']$/g, '');
          }
        }
      }
    });
  } catch (error) {
    console.warn('Could not load .env file:', error.message);
  }
}


export default {
  expo: {
    name: "flicksy",
    slug: "flicksy",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "flicksy",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      edgeToEdgeEnabled: true
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff"
        }
      ],
      "expo-secure-store",
      "expo-font",
      "expo-web-browser",
      "expo-sqlite"
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      router: {},
      eas: {
        projectId: "7a7fe3bb-a6e0-457a-b61b-ebd7ef055ea0"
      },
      tmdbApiKey: tmdbApiKey,
    }
  }
};
