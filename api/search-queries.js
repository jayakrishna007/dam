import getDb from './mongodb.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const db = await getDb();
    const collection = db.collection('search_queries');

    if (req.method === 'POST') {
      const { query } = req.body || {};
      if (!query || !query.trim()) {
        return res.status(400).json({ error: 'Query is required' });
      }
      const doc = {
        timestamp: new Date(),
        query: query.trim()
      };
      await collection.insertOne(doc);
      return res.status(201).json({ success: true });
    } 
    
    if (req.method === 'GET') {
      const documents = await collection.find({})
        .sort({ timestamp: -1 })
        .limit(100)
        .toArray();
      return res.status(200).json({ documents });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error("Vercel Serverless search-queries error:", error);
    return res.status(500).json({ error: error.message });
  }
}
