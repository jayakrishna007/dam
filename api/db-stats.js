import getDb from './mongodb.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const db = await getDb();

    // Get DB-level storage stats (in bytes)
    const dbStats = await db.command({ dbStats: 1, scale: 1 });

    // Count documents in each collection
    const collections = ['page_views', 'search_queries', 'dam_history'];
    const colStats = await Promise.all(
      collections.map(async (name) => {
        try {
          const col = db.collection(name);
          const count = await col.countDocuments();
          const stats = await db.command({ collStats: name, scale: 1 });
          return {
            name,
            count,
            sizeMB: parseFloat(((stats.size || 0) / 1024 / 1024).toFixed(3)),
            indexSizeMB: parseFloat(((stats.totalIndexSize || 0) / 1024 / 1024).toFixed(3)),
          };
        } catch {
          return { name, count: 0, sizeMB: 0, indexSizeMB: 0 };
        }
      })
    );

    // MongoDB Atlas Free tier = 512 MB storage
    const FREE_TIER_MB = 512;
    const usedMB = parseFloat(((dbStats.dataSize || 0) / 1024 / 1024).toFixed(2));
    const storageUsedMB = parseFloat(((dbStats.storageSize || 0) / 1024 / 1024).toFixed(2));
    const indexMB = parseFloat(((dbStats.indexSize || 0) / 1024 / 1024).toFixed(2));
    const totalUsedMB = parseFloat((storageUsedMB + indexMB).toFixed(2));
    const percentUsed = parseFloat(((totalUsedMB / FREE_TIER_MB) * 100).toFixed(1));
    const freeLeftMB = parseFloat((FREE_TIER_MB - totalUsedMB).toFixed(2));

    return res.status(200).json({
      freeTierLimitMB: FREE_TIER_MB,
      dataSizeMB: usedMB,
      storageSizeMB: storageUsedMB,
      indexSizeMB: indexMB,
      totalUsedMB,
      freeLeftMB,
      percentUsed,
      collections: colStats,
      objects: dbStats.objects || 0,
    });
  } catch (error) {
    console.error('DB stats error:', error);
    return res.status(500).json({ error: error.message });
  }
}
