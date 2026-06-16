import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;

// Use a global variable in development to prevent connection leaks across HMR reloads,
// and a local module-scoped cache in production.
let cachedDb = null;
let cachedClient = null;

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoCachedDb) {
    global._mongoCachedDb = null;
    global._mongoCachedClient = null;
  }
}

export default async function getDb() {
  if (!uri) {
    throw new Error("MongoDB Connection String (MONGODB_URI) is not configured.");
  }

  // Resolve cache based on environment
  const dbCache = process.env.NODE_ENV === 'development' ? global._mongoCachedDb : cachedDb;
  const clientCache = process.env.NODE_ENV === 'development' ? global._mongoCachedClient : cachedClient;

  if (dbCache && clientCache) {
    return dbCache;
  }

  // Initialize connection lazily inside the handler execution lifecycle
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000, // Fail fast instead of hanging
    socketTimeoutMS: 20000,
  });

  await client.connect();
  const db = client.db('damwatch');

  if (process.env.NODE_ENV === 'development') {
    global._mongoCachedDb = db;
    global._mongoCachedClient = client;
  } else {
    cachedDb = db;
    cachedClient = client;
  }

  return db;
}
