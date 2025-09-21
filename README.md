# Flicksy - Movie & TV Show Discovery App

A Tinder-esque mobile app for discovering movies and TV shows built with React Native and Expo.

## Features

- **Swipe Interface**: Swipe right to like, left to dislike movies and TV shows
- **User Authentication**: Login and registration system with persistent user data
- **Personalized Recommendations**: AI-powered recommendations based on your preferences
- **Watchlist**: Save liked content to your personal watchlist
- **User Profile**: View your stats and manage your account
- **Cross-Platform**: Works on iOS, Android, and Web

## Tech Stack

- **React Native** with Expo
- **TypeScript** for type safety
- **Expo Router** for navigation
- **React Native Gesture Handler** for swipe gestures
- **SQLite (expo-sqlite)** for secure local data persistence
- **TMDB API** for movie and TV show data
- **EAS Build** for app deployment

## Setup Instructions

### Prerequisites

- Node.js (v18 or later)
- npm or yarn
- Expo CLI
- EAS CLI (for building)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd flicksy
   ```

2. **Install dependencies**
   ```bash
   npm install
### Secure data storage

The app uses SQLite with encryption for sensitive data:

- Database setup in `services/db.ts`
- Crypto utilities (scrypt password hashing, AES-GCM): `services/crypto.ts`
- Master key stored in device secure storage: `services/secureStore.ts`
- High-level APIs: `services/secureDataService.ts`

Example:

```ts
import { registerUser, authenticateUser, storeEncryptedApiKey, retrieveDecryptedApiKey } from './services/secureDataService';

await registerUser('alice@example.com', 'SuperSecretPassword!');
const ok = await authenticateUser('alice@example.com', 'SuperSecretPassword!');

await storeEncryptedApiKey('tmdb', 'YOUR_REAL_API_KEY');
const key = await retrieveDecryptedApiKey('tmdb');
```

   ```

3. **Set up TMDB API**
   - Get a free API key from [The Movie Database (TMDB)](https://www.themoviedb.org/settings/api)
   - Open `services/movieApi.ts`
   - Replace `YOUR_TMDB_API_KEY` with your actual API key

4. **Start the development server**
   ```bash
   npm start
   ```

### Building for Production

1. **Install EAS CLI**
   ```bash
   npm install -g @expo/eas-cli
   ```

2. **Login to Expo**
   ```bash
   eas login
   ```

3. **Configure the project**
   ```bash
   eas build:configure
   ```

4. **Build for iOS**
   ```bash
   eas build --platform ios
   ```

5. **Build for Android**
   ```bash
   eas build --platform android
   ```

## Project Structure

```
flicksy/
├── app/                    # App screens and navigation
│   ├── (tabs)/            # Tab navigation screens
│   │   ├── index.tsx      # Main swipe screen
│   │   ├── watchlist.tsx  # Watchlist screen
│   │   └── explore.tsx    # Profile screen
│   └── _layout.tsx        # Root layout
├── components/            # Reusable components
│   └── MovieCard.tsx      # Swipeable movie card
├── contexts/              # React contexts
│   └── AuthContext.tsx    # Authentication context
├── screens/               # Screen components
│   ├── LoginScreen.tsx    # Login screen
│   ├── RegisterScreen.tsx # Registration screen
│   ├── SwipeScreen.tsx    # Main swipe interface
│   └── WatchlistScreen.tsx # Watchlist management
├── services/              # API and business logic
│   ├── movieApi.ts        # TMDB API integration
│   └── recommendationService.ts # Recommendation algorithm
└── assets/                # Images and fonts
```

## Key Features Explained

### Swipe Interface
- Uses React Native Gesture Handler for smooth swipe animations
- Cards show movie/TV show details with backdrop images
- Visual feedback with "LIKE" and "NOPE" indicators
- Action buttons for accessibility

### Recommendation System
- Learns from user preferences (liked/disliked content)
- Considers genre preferences, type preferences (movies vs TV shows)
- Uses TMDB's recommendation API for similar content
- Continuously improves suggestions based on user behavior

### Data Persistence
- User authentication data stored securely
- Preferences and watchlist saved locally
- Offline support for previously loaded content

## Customization

### Adding New Features
1. **New Screens**: Add to `app/(tabs)/` directory
2. **API Integration**: Extend `services/movieApi.ts`
3. **UI Components**: Add to `components/` directory
4. **Business Logic**: Add to `services/` directory

### Styling
- Uses React Native StyleSheet for styling
- Supports light/dark mode theming
- Responsive design for different screen sizes

## Troubleshooting

### Common Issues

1. **API Key Not Working**
   - Ensure your TMDB API key is valid
   - Check if the API key is properly set in `services/movieApi.ts`

2. **Build Errors**
   - Run `npx expo install --fix` to fix dependency issues
   - Clear cache with `npx expo start --clear`

3. **Gesture Handler Issues**
   - Ensure `react-native-gesture-handler` is properly installed
   - Check that `GestureHandlerRootView` wraps your app

### Getting Help

- Check the [Expo Documentation](https://docs.expo.dev/)
- Visit [React Native Documentation](https://reactnative.dev/)
- TMDB API documentation: [developers.themoviedb.org](https://developers.themoviedb.org/)

## License

This project is for educational purposes. Please respect TMDB's terms of service when using their API.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Future Enhancements

- [ ] Social features (sharing, friends)
- [ ] Advanced filtering options
- [ ] Push notifications for new releases
- [ ] Integration with streaming services
- [ ] Offline mode improvements
- [ ] Advanced recommendation algorithms