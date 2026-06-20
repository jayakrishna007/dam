export default async function handler(req, res) {
  // 1. Authenticate the Cron trigger request
  // Vercel passes "Authorization: Bearer <CRON_SECRET>" automatically when running cron schedules
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;

  // If CRON_SECRET is configured, enforce authorization
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized: Invalid Cron Secret' });
  }

  // 2. Load configurations
  const owner = process.env.GH_OWNER || 'jayakrishna007';
  const repo = process.env.GH_REPO || 'dam';
  const token = process.env.GH_PAT;

  if (!token) {
    return res.status(500).json({ 
      error: 'Configuration Error: GH_PAT environment variable is not defined on Vercel.' 
    });
  }

  // 3. Dispatch the GitHub Action Workflow
  const githubApiUrl = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/scrape.yml/dispatches`;

  try {
    const response = await fetch(githubApiUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'Vercel-Cron-Trigger'
      },
      body: JSON.stringify({
        ref: 'main'
      })
    });

    if (response.status === 204) {
      return res.status(200).json({ 
        success: true, 
        message: `Successfully triggered Daily Dam Scraper workflow in ${owner}/${repo}!` 
      });
    } else {
      const errorText = await response.text();
      return res.status(response.status).json({
        success: false,
        error: `GitHub API responded with status ${response.status}`,
        details: errorText
      });
    }
  } catch (error) {
    console.error('Failed to trigger GitHub Actions workflow:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal Server Error', 
      details: error.message 
    });
  }
}
