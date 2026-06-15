import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { pin } = req.body || {};
  if (pin !== '9197') {
    return res.status(401).json({ error: 'Unauthorized: Invalid Admin PIN' });
  }

  const rootDir = process.cwd();
  const scriptPath = path.join(rootDir, 'scripts', 'scrape_dams.py');

  if (!fs.existsSync(scriptPath)) {
    return res.status(404).json({ error: `Scraper script not found at ${scriptPath}` });
  }

  exec(`python "${scriptPath}"`, (error, stdout, stderr) => {
    // Read the newly updated scrape_status.json
    let updatedStatus = null;
    try {
      const statusPath = path.join(rootDir, 'src', 'data', 'scrape_status.json');
      if (fs.existsSync(statusPath)) {
        updatedStatus = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
      }
    } catch (e) {
      console.error("Failed to read updated scrape_status.json:", e);
    }

    if (error) {
      console.error(`Scraper execution failed: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: error.message,
        stderr: stderr,
        stdout: stdout,
        status: updatedStatus
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Scraper completed successfully',
      stdout: stdout,
      stderr: stderr,
      status: updatedStatus
    });
  });
}
