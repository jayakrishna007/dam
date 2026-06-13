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
    const collection = db.collection('page_views');

    if (req.method === 'POST') {
      const { session_id } = req.body || {};
      const doc = {
        timestamp: new Date(),
        session_id: session_id || 'anonymous'
      };
      await collection.insertOne(doc);
      return res.status(201).json({ success: true });
    } 
    
    if (req.method === 'GET') {
      const count = await collection.countDocuments();
      return res.status(200).json({ total: count });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error("Vercel Serverless page-views error:", error);
    return res.status(500).json({ error: error.message });
  }
}
