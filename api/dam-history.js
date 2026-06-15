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
    const collection = db.collection('dam_history');

    if (req.method === 'POST') {
      const { readings } = req.body || {};
      if (!readings || !Array.isArray(readings) || readings.length === 0) {
        return res.status(400).json({ error: 'readings array is required' });
      }
      const docs = readings.map(r => ({
        dam_id: r.dam_id,
        name: r.name,
        level: r.level,
        capacity: r.capacity,
        inflow: r.inflow,
        outflow: r.outflow,
        timestamp: new Date(r.timestamp || Date.now())
      }));
      const result = await collection.insertMany(docs);
      return res.status(201).json({ success: true, inserted: result.insertedCount });
    }

    if (req.method === 'GET') {
      const damId = parseInt(req.query.dam_id);
      if (isNaN(damId)) {
        return res.status(400).json({ error: 'dam_id query parameter is required' });
      }
      const documents = await collection.find({ dam_id: damId })
        .sort({ timestamp: -1 })
        .limit(90)
        .toArray();
      return res.status(200).json({ documents });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error("Vercel Serverless dam-history error:", error);
    return res.status(500).json({ error: error.message });
  }
}
