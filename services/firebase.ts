import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDz5UZ69OnOLrGbSjNRTIwGL1sS7NbigvQ",
  authDomain: "anestoryai.firebaseapp.com",
  projectId: "anestoryai",
  storageBucket: "anestoryai.firebasestorage.app",
  messagingSenderId: "927330435478",
  appId: "1:927330435478:web:d0d6c70c99765ae182ddb7",
  measurementId: "G-8MCRGVK47Q"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);