import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA1SslRQo5jhVECbrl81vkCe2zE_EOtqxE",
  authDomain: "shopping-list-dev-319dd.firebaseapp.com",
  projectId: "shopping-list-dev-319dd",
  storageBucket: "shopping-list-dev-319dd.firebasestorage.app",
  messagingSenderId: "865167112779",
  appId: "1:865167112779:web:3b252b17398c48f0492bce"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);