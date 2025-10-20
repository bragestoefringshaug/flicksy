import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyB7leusJKFYdbwXpKQa5kawDfW1fzFtWbQ",
    authDomain: "flicksy-1.firebaseapp.com",
    databaseURL: "https://flicksy-1-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "flicksy-1",
    storageBucket: "flicksy-1.firebasestorage.app",
    messagingSenderId: "652032009557",
    appId: "1:652032009557:web:20132e8aa2ed2d6a77fbdc",
    measurementId: "G-696RKJ70YF"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Firebase Realtime Database and get a reference to the service
export const database = getDatabase(app);

export default app;
