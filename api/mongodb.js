import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
let client;
let clientPromise;

if (!uri) {
  console.warn("WARNING: MONGODB_URI is not set in environment variables.");
} else {
  if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClientPromise) {
      client = new MongoClient(uri);
      global._mongoClientPromise = client.connect();
    }
    clientPromise = global._mongoClientPromise;
  } else {
    client = new MongoClient(uri);
    clientPromise = client.connect();
  }
}

export default async function getDb() {
  if (!clientPromise) {
    throw new Error("MongoDB Connection String (MONGODB_URI) is not configured.");
  }
  const con = await clientPromise;
  return con.db('damwatch');
}
