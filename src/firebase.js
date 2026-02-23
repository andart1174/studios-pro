import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBNB1Whl4DCQPLGiCmAOpW7yXK1uGZXc9c",
    authDomain: "studios-pro.firebaseapp.com",
    projectId: "studios-pro",
    storageBucket: "studios-pro.firebasestorage.app",
    messagingSenderId: "337301506363",
    appId: "1:337301506363:web:68b84724390b830bbf4f1e",
    measurementId: "G-PG01CWHZDF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
