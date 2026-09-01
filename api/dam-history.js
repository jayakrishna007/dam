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
      const rawDamId = req.query.dam_id;
      const rawName = req.query.name;
      if (!rawDamId && !rawName) {
        return res.status(400).json({ error: 'dam_id or name query parameter is required' });
      }

      const parsedId = parseInt(rawDamId);
      const filter = {};

      if (rawDamId) {
        filter.$or = [
          { dam_id: rawDamId },
          ...(isNaN(parsedId) ? [] : [{ dam_id: parsedId }])
        ];
      }

      if (rawName) {
        filter.name = { $regex: new RegExp(`^${rawName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') };
      }

      if (req.query.start_date || req.query.end_date) {
        filter.timestamp = {};
        if (req.query.start_date) {
          filter.timestamp.$gte = new Date(req.query.start_date);
        }
        if (req.query.end_date) {
          const endDate = new Date(req.query.end_date);
          endDate.setHours(23, 59, 59, 999);
          filter.timestamp.$lte = endDate;
        }
      }

      let cursor = collection.find(filter).sort({ timestamp: -1 });
      const limitParam = req.query.limit;
      if (limitParam && limitParam !== 'all' && limitParam !== '0') {
        const parsedLimit = parseInt(limitParam);
        if (!isNaN(parsedLimit) && parsedLimit > 0) {
          cursor = cursor.limit(parsedLimit);
        }
      }

      const documents = await cursor.toArray();
      return res.status(200).json({ documents });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error("Vercel Serverless dam-history error:", error);
    return res.status(500).json({ error: error.message });
  }
}
