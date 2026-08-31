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

const getStateSlug = (state) => {
  if (!state || state === 'all') return '';
  return state
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '');
};

const getZoneSlug = (zone) => {
  if (!zone || zone === 'All') return '';
  return zone
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '');
};

function main() {
  const rootDir = path.resolve(__dirname, '..');
  const dataDir = path.join(rootDir, 'src', 'data');
  const datasets = [
    'dams.json',
    'dams_usa.json',
    'dams_brazil.json',
    'dams_thailand.json',
    'dams_nepal.json',
    'dams_laos.json',
    'dams_vietnam.json'
  ];

  let allDams = [];
  datasets.forEach(file => {
    const fullPath = path.join(dataDir, file);
    if (fs.existsSync(fullPath)) {
      try {
        allDams = allDams.concat(JSON.parse(fs.readFileSync(fullPath, 'utf8')));
      } catch (e) {}
    }
  });

  const COUNTRY_ZONES = {
    'India': ['North', 'South', 'East', 'West', 'Central'],
    'USA': ['California', 'Colorado River', 'Columbia River', 'Missouri River', 'Tennessee River'],
    'Brazil': ['Amazon', 'São Francisco', 'Paraná', 'Northeast', 'Uruguay'],
    'Thailand': ['Mekong Basin', 'Northern Basin', 'Western Basin', 'Southern Basin'],
    'Nepal': ['Bagmati Basin', 'Gandaki Basin', 'Koshi Basin', 'Mahakali Basin'],
    'Laos': ['Mekong Mainstream', 'Nam Ngum Basin', 'Nam Theun Basin', 'Nam Ou Cascade'],
    'Vietnam': ['Sesan Basin (Mekong)', 'Srepok Basin (Mekong)', 'Northern Basin', 'Southern Basin']
  };

  const baseUrl = 'https://damtoday.com';
  const today = new Date().toISOString().split('T')[0];

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  // Static routes
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

  // Zone routes
  const seenZones = new Set();
  Object.values(COUNTRY_ZONES).flat().forEach(zone => {
    const slug = getZoneSlug(zone);
    if (slug && !seenZones.has(slug)) {
      seenZones.add(slug);
      xml += '  <url>\n';
      xml += `    <loc>${baseUrl}/zone/${slug}</loc>\n`;
      xml += `    <lastmod>${today}</lastmod>\n`;
      xml += `    <changefreq>daily</changefreq>\n`;
      xml += `    <priority>0.8</priority>\n`;
      xml += '  </url>\n';
    }
  });

  // State routes
  const seenStates = new Set();
  allDams.forEach(dam => {
    if (dam.state) {
      const slug = getStateSlug(dam.state);
      if (slug && !seenStates.has(slug)) {
        seenStates.add(slug);
        xml += '  <url>\n';
        xml += `    <loc>${baseUrl}/state/${slug}</loc>\n`;
        xml += `    <lastmod>${today}</lastmod>\n`;
        xml += `    <changefreq>daily</changefreq>\n`;
        xml += `    <priority>0.8</priority>\n`;
        xml += '  </url>\n';
      }
    }
  });

  // Dynamic dam pages
  const seenSlugs = new Set();
  allDams.forEach(dam => {
    const slug = getDamSlug(dam.name);
    if (!seenSlugs.has(slug)) {
      seenSlugs.add(slug);
      xml += '  <url>\n';
      xml += `    <loc>${baseUrl}/dam/${slug}</loc>\n`;
      xml += `    <lastmod>${today}</lastmod>\n`;
      xml += `    <changefreq>daily</changefreq>\n`;
      xml += `    <priority>0.8</priority>\n`;
      xml += '  </url>\n';
    }
  });

  xml += '</urlset>\n';

  const sitemapPath = path.join(rootDir, 'public', 'sitemap.xml');
  fs.writeFileSync(sitemapPath, xml, 'utf8');
  console.log(`Successfully generated sitemap.xml with ${staticRoutes.length + seenZones.size + seenStates.size + seenSlugs.size} URLs at ${sitemapPath}`);
}

main();
