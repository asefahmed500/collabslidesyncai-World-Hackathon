
import mongoose from 'mongoose';
import { config } from 'dotenv';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import path from 'path';

// Load environment variables from .env.local first, then .env at the project root
config({ path: path.resolve(process.cwd(), '.env.local') });
config({ path: path.resolve(process.cwd(), '.env') }); // .env will not override .env.local

const MONGODB_URI = process.env.MONGODB_URI;

async function resetDatabase() {
  if (!MONGODB_URI) {
    console.error('\n❌ ERROR: MONGODB_URI is not defined in your .env file.');
    console.error('Please ensure your .env file contains a valid MONGODB_URI.');
    process.exit(1);
  }

  // Safety check for production environment
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PROD_DB_RESET !== 'true') {
    console.error('\n❌ ERROR: Database reset is disabled in production environment.');
    console.error('This script is intended for development/testing purposes only.');
    console.error('To enable reset in a production-like environment (EXTREMELY DANGEROUS),');
    console.error('you MUST set the ALLOW_PROD_DB_RESET=true environment variable.');
    process.exit(1);
  }

  console.warn('\n⚠️ WARNING: This script will permanently delete ALL data in the database specified by MONGODB_URI.');
  console.warn(`   Database URI: ${MONGODB_URI}`);
  console.warn('   This operation is IRREVERSIBLE.\n');

  const rl = readline.createInterface({ input, output });

  try {
    const confirmationDBName = MONGODB_URI.split('/').pop()?.split('?')[0] || 'unknown_db_name_from_uri';
    
    if (confirmationDBName === 'unknown_db_name_from_uri' || confirmationDBName.trim() === '') {
        console.error('\n❌ ERROR: Could not automatically determine the database name from MONGODB_URI.');
        console.error('   Please ensure your MONGODB_URI is correctly formatted and includes the database name.');
        console.error('   Example: mongodb://user:pass@host:port/MY_DATABASE_NAME?options');
        process.exit(1);
    }
    
    console.log(`   ℹ️  To proceed, you MUST type the exact database name: "${confirmationDBName}"`);
    
    const answer = await rl.question(`Type the database name "${confirmationDBName}" to confirm dropping it, or anything else to cancel: `);
    
    if (answer !== confirmationDBName) {
      console.log('\n🚫 Database reset aborted by user. The string typed did not match the required database name.');
      process.exit(0);
    }

    console.log('\n🔄 Proceeding with database reset...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB.');

    const dbName = mongoose.connection.name;
    if (!mongoose.connection.db) {
      throw new Error('MongoDB connection is not established or db is undefined.');
    }
    await mongoose.connection.db.dropDatabase();
    console.log(`✅ Database "${dbName}" dropped successfully.`);

  } catch (error) {
    console.error('\n❌ Error resetting database:', error);
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState === 1) { // Check if connection is open before trying to disconnect
      await mongoose.disconnect();
      console.log('🔌 Disconnected from MongoDB.');
    }
    rl.close();
  }
}

resetDatabase();
