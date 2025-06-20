
import mongoose from 'mongoose';

// Log at the very top of the file to ensure this runs when the module is loaded.
console.log('Attempting to load MONGODB_URI. Value:', process.env.MONGODB_URI);

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  // This log will appear in the server console if MONGODB_URI is undefined
  console.error("CRITICAL ERROR: MONGODB_URI is not defined in environment variables.");
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env or .env.local'
  );
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections from growing exponentially
 * during API Route usage.
 */
let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    // console.log("Using cached MongoDB connection.");
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };
    // console.log("Creating new MongoDB connection promise.");
    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
      // console.log("MongoDB connection promise resolved.");
      return mongoose;
    }).catch(err => {
      // console.error("MongoDB connection promise failed:", err);
      cached.promise = null; // Reset promise on failure
      throw err; // Re-throw error to be caught by caller
    });
  }
  
  try {
    // console.log("Awaiting MongoDB connection promise.");
    cached.conn = await cached.promise;
    // console.log("MongoDB connected successfully.");
  } catch (e) {
    // console.error("Failed to establish MongoDB connection from promise:", e);
    cached.promise = null; // Reset promise on failure
    throw e; // Re-throw error
  }
  
  return cached.conn;
}

export default dbConnect;
