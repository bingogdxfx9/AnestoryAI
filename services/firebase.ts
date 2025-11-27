import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyDz5UZ69OnOLrGbSjNRTIwGL1sS7NbigvQ",
  authDomain: "anestoryai.firebaseapp.com",
  projectId: "anestoryai",
  storageBucket: "anestoryai.firebasestorage.app",
  messagingSenderId: "927330435478",
  appId: "1:927330435478:web:d0d6c70c99765ae182ddb7",
  measurementId: "G-8MCRGVK47Q"
};

// Initialize Firebase using Compat syntax
const app = firebase.initializeApp(firebaseConfig);

// Initialize services
export const db = firebase.firestore();
export const analytics = firebase.analytics();