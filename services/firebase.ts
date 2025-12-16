import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

// Define the global config type expected from the environment
declare global {
  interface Window {
    __firebase_config?: any;
  }
}

// Fallback config (from prompt) used only if the environment doesn't inject one
const fallbackConfig = {
  apiKey: "AIzaSyDz5UZ69OnOLrGbSjNRTIwGL1sS7NbigvQ",
  authDomain: "anestoryai.firebaseapp.com",
  projectId: "anestoryai",
  storageBucket: "anestoryai.firebasestorage.app",
  messagingSenderId: "927330435478",
  appId: "1:927330435478:web:d0d6c70c99765ae182ddb7",
  measurementId: "G-8MCRGVK47Q"
};

// Use injected config or fallback
const firebaseConfig = window.__firebase_config || fallbackConfig;

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firestore & Auth
export const db = getFirestore(app);
export const auth = getAuth(app);