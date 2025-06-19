
import admin from 'firebase-admin';

// IMPORTANT: You need to set up Firebase Admin SDK credentials.
// Option 1: Set GOOGLE_APPLICATION_CREDENTIALS environment variable
// to the path of your service account key JSON file.
//
// Option 2: Initialize with credentials directly (less secure for some environments)
// import serviceAccount from './path/to/your-service-account-key.json'; // Update path
//
// if (!admin.apps.length) {
//   try {
//     admin.initializeApp({
//       credential: admin.credential.cert(serviceAccount),
//       // databaseURL: "https://<YOUR_PROJECT_ID>.firebaseio.com" // If using Realtime Database
//     });
//     console.log('Firebase Admin SDK initialized successfully.');
//   } catch (error) {
//     console.error('Firebase Admin SDK initialization error:', error);
//   }
// }

// Using environment variable approach (recommended for most deployments)
if (!admin.apps.length) {
  try {
    // Check if GOOGLE_APPLICATION_CREDENTIALS is set, otherwise admin.initializeApp() will throw an error
    // This check helps catch issues earlier during development or build if env var is missing.
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.FIREBASE_CONFIG) {
        console.warn(
            "WARNING: Firebase Admin SDK - GOOGLE_APPLICATION_CREDENTIALS environment variable is not set. " +
            "Admin SDK features like user management will not work until this is configured " +
            "with your Firebase project's service account key. " +
            "Alternatively, you can initialize with admin.credential.applicationDefault() if running in a Google Cloud environment."
        );
        // For local dev without GOOGLE_APPLICATION_CREDENTIALS and to prevent crashing the app:
        // We can initialize a default app, but it won't have auth permissions without creds.
        // Or, simply don't initialize if credentials are not found, and let API routes handle the uninitialized state.
        // For now, we'll let it try to initialize and log if it fails below.
    }
    
    admin.initializeApp(); // Uses GOOGLE_APPLICATION_CREDENTIALS or infers from environment if on GCP.
    console.log('Firebase Admin SDK initialized (or attempted via default).');
  } catch (error: any) {
    // Log a more specific error if initialization fails.
    console.error('Firebase Admin SDK initialization error:', error.message);
    console.error(
        'Ensure your GOOGLE_APPLICATION_CREDENTIALS environment variable is set correctly, ' +
        'or that your runtime environment (e.g., Google Cloud Functions) has appropriate default credentials.'
    );
  }
}


// Export auth and other admin services if needed globally
// For now, API routes will import 'admin' directly.
export default admin;
