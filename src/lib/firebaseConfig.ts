
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional

const firebaseApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const firebaseAuthDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const firebaseProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const firebaseStorageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const firebaseMessagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const firebaseAppId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

// Helper function to check individual config values
const checkFirebaseConfigValue = (value: string | undefined, envVarName: string, humanName: string, examplePlaceholder?: string) => {
  const placeholder = examplePlaceholder || `YOUR_${humanName.toUpperCase().replace(/ /g, '_')}`;
  if (!value || value === placeholder || value.trim() === "") {
    const message = `CRITICAL FIREBASE CONFIGURATION ERROR: Firebase config value for ${envVarName} (${humanName}) is missing, is a placeholder ('${placeholder}'), or is empty. ` +
                    `Please set this in your .env file with your actual Firebase project's value. ` +
                    "The application will not function correctly until this is resolved. " +
                    "You can find these values in your Firebase project settings under 'Web apps'.";
    console.error(message);
    throw new Error(message); // Throw error to stop execution
  }
  return value; // Return validated value
};

// Validate essential Firebase configuration values
const checkedFirebaseApiKey = checkFirebaseConfigValue(firebaseApiKey, 'NEXT_PUBLIC_FIREBASE_API_KEY', 'API Key', 'YOUR_API_KEY');
const checkedFirebaseAuthDomain = checkFirebaseConfigValue(firebaseAuthDomain, 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', 'Auth Domain');
const checkedFirebaseProjectId = checkFirebaseConfigValue(firebaseProjectId, 'NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'Project ID');
// Note: storageBucket, messagingSenderId, and appId are also important but might not always cause an immediate "invalid-api-key" error with getAuth().
// If further issues arise, these should also be checked with the same rigor.
// For now, we'll use the potentially undefined values for less critical ones,
// but ensure the core ones that cause `getAuth` to fail are validated.
const checkedFirebaseStorageBucket = firebaseStorageBucket; // No strict check for now, can be undefined
const checkedFirebaseMessagingSenderId = firebaseMessagingSenderId; // No strict check for now
const checkedFirebaseAppId = firebaseAppId; // No strict check for now


const firebaseConfig: FirebaseOptions = {
  apiKey: checkedFirebaseApiKey,
  authDomain: checkedFirebaseAuthDomain,
  projectId: checkedFirebaseProjectId,
  storageBucket: checkedFirebaseStorageBucket,
  messagingSenderId: checkedFirebaseMessagingSenderId,
  appId: checkedFirebaseAppId,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Optional
};

// Initialize Firebase
let app;
// This try-catch is more for if initializeApp itself fails for reasons other than bad keys (e.g., network, duplicate init)
try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
} catch (error: any) {
  console.error("Firebase app initialization failed during initializeApp call:", error);
  throw new Error(`Firebase app initialization failed directly. Original error: ${error.message}. Ensure your Firebase project is set up correctly and accessible, and that all Firebase config values in .env are correct.`);
}

const auth = getAuth(app); // If config values like API key are wrong (but not placeholders caught above), this is where it typically errors out.
const db = getFirestore(app);

export { app, auth, db };

