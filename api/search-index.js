// Site search index: the saved pages plus published WordPress.com blog posts.
// Served at /search-index.json (see vercel.json) and cached for 5 minutes.
const fs = require('fs');
const path = require('path');

const SITE = process.env.WPCOM_SITE || '258615053';
const API = `https://public-api.wordpress.com/wp/v2/sites/${encodeURIComponent(SITE)}/posts?per_page=100&_fields=slug,title,content`;
const text = (h) => String(h || '').replace(/<[^>]+>/g, ' ')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
  .replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();

module.exports = async (req, res) => {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '_templates', 'search-index.json'), 'utf8'));
  try {
    const r = await fetch(API, { headers: { 'User-Agent': 'mumtalks.ie' } });
    if (r.ok) {
      const have = new Set(data.index.map((e) => e.u));
      for (const p of await r.json()) {
        const u = `/blog/${p.slug}/`;
        if (!have.has(u)) data.index.push({ t: text(p.title && p.title.rendered), u, x: text(p.content && p.content.rendered) });
      }
    } else console.error('Search index: WordPress.com returned', r.status);
  } catch (e) { console.error('Search index:', e.message); }
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=86400');
  res.end(JSON.stringify(data));
};
