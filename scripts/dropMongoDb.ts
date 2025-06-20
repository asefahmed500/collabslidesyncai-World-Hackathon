
import mongoose from 'mongoose';
import * as readline from 'readline';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env or .env.local at the project root
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') }); // .env will not override .env.local

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error(
    '\x1b[31m%s\x1b[0m', // Red color
    'Error: MONGODB_URI is not defined in your .env or .env.local file.'
  );
  process.exit(1);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const askQuestion = (query: string): Promise<string> => {
  return new Promise((resolve) => rl.question(query, resolve));
};

async function dropDatabase() {
  const dbNameFromArgs = process.argv[2];

  if (!dbNameFromArgs) {
    console.error(
      '\x1b[31m%s\x1b[0m',
      'Error: Please provide the database name as a command-line argument.'
    );
    console.log('Usage: npm run db:drop -- <databaseName>');
    console.log('Example: npm run db:drop -- collabdb');
    rl.close();
    process.exit(1);
  }

  // Extract the database name from the MONGODB_URI for comparison
  let defaultDbName = '';
  try {
    const url = new URL(MONGODB_URI);
    defaultDbName = url.pathname.substring(1).split('?')[0]; // Remove leading '/' and query params
  } catch (e) {
    console.error('\x1b[31m%s\x1b[0m', 'Error: Invalid MONGODB_URI format.');
    rl.close();
    process.exit(1);
  }

  console.log(
    '\x1b[33m%s\x1b[0m', // Yellow color
    `WARNING: You are about to drop the database named "${dbNameFromArgs}".`
  );
  if (dbNameFromArgs === defaultDbName) {
    console.log(
      '\x1b[33m%s\x1b[0m',
      `This is the default database specified in your MONGODB_URI.`
    );
  }
  console.log('\x1b[31m%s\x1b[0m', 'This action is IRREVERSIBLE and will delete all data in this database.');

  const confirmation = await askQuestion(
    `Type the database name "${dbNameFromArgs}" again to confirm: `
  );

  if (confirmation !== dbNameFromArgs) {
    console.log('\x1b[32m%s\x1b[0m', 'Database drop cancelled. Confirmation did not match.');
    rl.close();
    process.exit(0);
  }

  try {
    // To drop a specific database, we connect to *any* database (often 'admin' or the default one in URI)
    // and then switch to the target database to drop it.
    // Mongoose connect method implicitly uses the db from the URI. If target is different, need to adjust.

    let tempUri = MONGODB_URI;
    // If dbNameFromArgs is different from defaultDbName, we need to make sure we connect to a db to issue drop command for *another* db
    // If MONGODB_URI already specifies the target DB, Mongoose connection.db points to it.
    // If MONGODB_URI specifies a *different* DB, we can still drop the target DB.
    // For simplicity, we'll connect using the provided MONGODB_URI and then use the connection.db object.

    await mongoose.connect(tempUri, {
      // bufferCommands: false, // Optional: Mongoose specific
    });
    console.log(`Connected to MongoDB instance (using URI default DB for connection).`);

    // Get a reference to the database to be dropped
    const dbToDrop = mongoose.connection.client.db(dbNameFromArgs);

    console.log(`Attempting to drop database "${dbNameFromArgs}"...`);
    await dbToDrop.dropDatabase();

    console.log(
      '\x1b[32m%s\x1b[0m', // Green color
      `Database "${dbNameFromArgs}" dropped successfully.`
    );
  } catch (error) {
    console.error(
      '\x1b[31m%s\x1b[0m',
      `Error dropping database "${dbNameFromArgs}":`,
      error
    );
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    rl.close();
  }
}

dropDatabase();
