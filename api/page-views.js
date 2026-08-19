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
      const { today } = req.query || {};

      if (today === '1') {
        // Count only docs inserted today in IST (UTC+5:30)
        const offsetMs = 5.5 * 60 * 60 * 1000;
        const nowIST = new Date(Date.now() + offsetMs);
        const startOfDayIST = new Date(nowIST);
        startOfDayIST.setUTCHours(0, 0, 0, 0);
        const startUTC = new Date(startOfDayIST.getTime() - offsetMs);
        const count = await collection.countDocuments({ timestamp: { $gte: startUTC } });
        return res.status(200).json({ total: count });
      }

      const count = await collection.countDocuments();
      return res.status(200).json({ total: count });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error("Vercel Serverless page-views error:", error);
    return res.status(500).json({ error: error.message });
  }
}
