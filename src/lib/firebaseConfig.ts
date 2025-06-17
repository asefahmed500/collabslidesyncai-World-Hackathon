
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional

const firebaseApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

if (!firebaseApiKey || firebaseApiKey === "YOUR_API_KEY" || firebaseApiKey.trim() === "") {
  const message = "CRITICAL FIREBASE CONFIGURATION ERROR: Firebase API Key is missing, is a placeholder ('YOUR_API_KEY'), or is empty. " +
                  "Please set NEXT_PUBLIC_FIREBASE_API_KEY in your .env file with your actual Firebase project's API key. " +
                  "The application will not function correctly until this is resolved. " +
                  "You can find this key in your Firebase project settings under 'Web apps'.";
  console.error(message);
  // For critical errors like this, you might throw an error in a production app,
  // or ensure a user-friendly message is displayed prominently.
  // For Firebase Studio, a detailed console error helps in debugging.
}


const firebaseConfig: FirebaseOptions = {
  apiKey: firebaseApiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Optional
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
