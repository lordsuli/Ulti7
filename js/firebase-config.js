// ==================== firebase-config.js ====================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAf6X1zhZtphhZb9voLUW_lIUWII1BA8fg",
  authDomain: "ulti-emele.firebaseapp.com",
  projectId: "ulti-emele",
  storageBucket: "ulti-emele.firebasestorage.app",
  messagingSenderId: "138249987485",
  appId: "1:138249987485:web:7d7b3719a9004746907b74",
  measurementId: "G-PVWJD6K24K"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Shared instances
export const auth = getAuth(app);
export const db   = getFirestore(app);