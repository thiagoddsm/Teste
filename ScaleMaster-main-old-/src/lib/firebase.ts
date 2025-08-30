import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  projectId: "scalemaster-xemva",
  appId: "1:523193415361:web:d2bacc4fd18e4b72ec4640",
  storageBucket: "scalemaster-xemva.firebasestorage.app",
  apiKey: "AIzaSyBGgQQxmhEtQzWqfKHVX_eY91EpZa_eNR8",
  authDomain: "scalemaster-xemva.firebaseapp.com",
  measurementId: "",
  messagingSenderId: "523193415361"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
