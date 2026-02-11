import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA1Ss1RQo5jhVECbrl81vkCe2zE_E0tqxE",
  authDomain: "shopping-list-dev-319dd.firebaseapp.com",
  projectId: "shopping-list-dev-319dd",
  storageBucket: "shopping-list-dev-319dd.firebasestorage.app",
  messagingSenderId: "865167112779",
  appId: "1:865167112779:web:39488e5b2276b993492bce"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
