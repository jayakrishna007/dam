const fs = require('fs');
const path = require('path');

const getDamSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '')
    .replace(/\-+/g, '-')
    .replace(/(^-|-$)/g, '');
};

function main() {
  const rootDir = path.resolve(__dirname, '..');
  const damsPath = path.join(rootDir, 'src', 'data', 'dams.json');
  
  if (!fs.existsSync(damsPath)) {
    console.error(`Dams data file not found at ${damsPath}`);
    process.exit(1);
  }

  const dams = JSON.parse(fs.readFileSync(damsPath, 'utf8'));
  const baseUrl = 'https://damtoday.com';
  const today = new Date().toISOString().split('T')[0];

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  // Add static routes
  const staticRoutes = [
    { path: '', changefreq: 'daily', priority: '1.0' },
    { path: '/about', changefreq: 'weekly', priority: '0.6' },
    { path: '/contact', changefreq: 'weekly', priority: '0.6' },
    { path: '/privacy', changefreq: 'monthly', priority: '0.3' }
  ];

  staticRoutes.forEach(route => {
    xml += '  <url>\n';
    xml += `    <loc>${baseUrl}${route.path}</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += `    <changefreq>${route.changefreq}</changefreq>\n`;
    xml += `    <priority>${route.priority}</priority>\n`;
    xml += '  </url>\n';
  });

  // Add dynamic dam pages
  dams.forEach(dam => {
    const slug = getDamSlug(dam.name);
    xml += '  <url>\n';
    xml += `    <loc>${baseUrl}/dam/${slug}</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += `    <changefreq>daily</changefreq>\n`;
    xml += `    <priority>0.8</priority>\n`;
    xml += '  </url>\n';
  });

  xml += '</urlset>\n';

  const sitemapPath = path.join(rootDir, 'public', 'sitemap.xml');
  fs.writeFileSync(sitemapPath, xml, 'utf8');
  console.log(`Successfully generated sitemap.xml with ${staticRoutes.length + dams.length} URLs at ${sitemapPath}`);
}

main();
