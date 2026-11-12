// Mum Talks blog, powered by WordPress.com.
//
// Posts are written in WordPress.com (default site: mumtalksie.wordpress.com)
// and shown here in the Mum Talks design. Only *published* posts appear;
// drafts stay private in WordPress.com.
//
//   /blog/          -> list of posts (WordPress.com posts + the hand-built ones in /blog/)
//   /blog/<slug>/   -> a single post
//
// Pages are cached at Vercel's edge for 5 minutes, so a newly published post
// shows up within about 5 minutes. Optional environment variable:
//   WPCOM_SITE  – WordPress.com site ID or domain (default 258615053 = mumtalksie.wordpress.com)
const fs = require('fs');
const path = require('path');

const SITE = process.env.WPCOM_SITE || '258615053';
const API = `https://public-api.wordpress.com/wp/v2/sites/${encodeURIComponent(SITE)}/posts`;
const ORIGIN = 'https://mumtalks.ie';
const ROOT = path.join(__dirname, '..');
const FALLBACK_IMG = '/_img/wp-content/uploads/2023/01/empowered-img-16e88f49.png';

// Posts that live as hand-built pages in /blog/<slug>/index.html
const STATIC_POSTS = [
  {
    slug: 'when-your-brother-is-the-favourite-child',
    title: 'The Golden Boy: When Your Brother Is the Favourite Child',
    excerpt: "For the sisters who grew up watching their brother get the bigger welcome, the lighter load and the louder applause. It wasn't in your head, and you're not on your own.",
    date: '2026-11-11T09:00:00',
    minutes: 8,
    tag: 'Family Life',
    image: '/blog-images/golden-boy-hero-wide.jpg',
    alt: 'A young boy hugging his little sister in a sunlit field',
  },
];

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“' };
const decode = (s) => String(s || '')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&([a-z]+);/gi, (m, n) => (n.toLowerCase() in ENT ? ENT[n.toLowerCase()] : m));
const text = (html) => decode(String(html || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const fmtDate = (d) => new Date(d).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Dublin' });
const minutes = (html) => Math.max(1, Math.round(text(html).split(' ').length / 200));
const enc = encodeURIComponent;

function fromWp(p) {
  const media = p._embedded && p._embedded['wp:featuredmedia'] && p._embedded['wp:featuredmedia'][0];
  const cats = (p._embedded && p._embedded['wp:term'] && p._embedded['wp:term'][0]) || [];
  const cat = cats.find((c) => c.slug !== 'uncategorized');
  let excerpt = text(p.excerpt && p.excerpt.rendered).replace(/\s*(\[…\]|\[\.\.\.\]|…)\s*$/, '…');
  return {
    slug: p.slug,
    title: text(p.title && p.title.rendered),
    excerpt,
    date: p.date,
    minutes: minutes(p.content && p.content.rendered),
    tag: cat ? text(cat.name) : 'Mum Talks',
    image: media && media.source_url ? media.source_url : FALLBACK_IMG,
    alt: (media && media.alt_text) || '',
    content: p.content && p.content.rendered,
  };
}

async function wp(query) {
  const r = await fetch(`${API}?_embed=1&${query}`, { headers: { 'User-Agent': 'mumtalks.ie' } });
  if (!r.ok) throw new Error(`WordPress.com returned ${r.status}`);
  return (await r.json()).map(fromWp);
}

function card(p, featured) {
  return `<a class="mt-card${featured ? ' mt-card--featured' : ''}" data-aos="fade-up" href="/blog/${esc(p.slug)}/">
<div class="mt-card-img"><img alt="${esc(p.alt)}" loading="lazy" src="${esc(p.image)}"/></div>
<div class="mt-card-body">
<span class="mt-tag">${esc(p.tag)}</span>
<h3>${esc(p.title)}</h3>
<p>${esc(p.excerpt)}</p>
<span class="mt-card-meta">${fmtDate(p.date)} · ${p.minutes} min read</span>
<span class="mt-read">Read the story →</span>
</div>
</a>`;
}

function article(p) {
  const url = `${ORIGIN}/blog/${p.slug}/`;
  const t = enc(p.title), u = enc(url);
  return `<div aria-hidden="true" class="mt-progress"><span></span></div>
<article class="mt-post">
<header class="mt-post-hero">
<img alt="${esc(p.alt)}" src="${esc(p.image)}"/>
<div class="mt-post-hero-inner">
<div class="container">
<a class="mt-back" href="/blog/">← All stories</a>
<h6 class="mt-kicker">${esc(p.tag)}</h6>
<h1>${esc(p.title)}</h1>
<p class="mt-meta"><span>${fmtDate(p.date)}</span><span>${p.minutes} min read</span><span>By Mum Talks</span></p>
</div>
</div>
</header>
<div class="container">
<div class="mt-post-body mt-wp-content" data-aos="fade-up">
${p.excerpt ? `<p class="mt-standfirst">${esc(p.excerpt)}</p>` : ''}
${p.content || ''}
<aside class="mt-cta-box">
<h3>Come and join us</h3>
<p>Meet other mums in person at a Mum Talks event near you, or email us at <a href="mailto:hello@mumtalks.ie">hello@mumtalks.ie</a>.</p>
<a class="mt-btn" href="/upcoming-events/">See upcoming events</a>
</aside>
<div class="mt-share">
<span>Share this story</span>
<a aria-label="Share on WhatsApp" href="https://wa.me/?text=${t}%20${u}" rel="noopener" target="_blank">WhatsApp</a>
<a aria-label="Share on Facebook" href="https://www.facebook.com/sharer/sharer.php?u=${u}" rel="noopener" target="_blank">Facebook</a>
<a aria-label="Share on LinkedIn" href="https://www.linkedin.com/sharing/share-offsite/?url=${u}" rel="noopener" target="_blank">LinkedIn</a>
<a aria-label="Share by email" href="mailto:?subject=${t}&amp;body=${u}">Email</a>
<button class="mt-copy" data-url="${esc(url)}" type="button">Copy link</button>
</div>
</div>
</div>
</article>`;
}

function headMeta(p) {
  const url = `${ORIGIN}/blog/${p.slug}/`;
  const img = /^https?:/.test(p.image) ? p.image : ORIGIN + p.image;
  const ld = { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: p.title, datePublished: p.date,
    image: img, author: { '@type': 'Organization', name: 'Mum Talks' }, description: p.excerpt, mainEntityOfPage: url };
  return `<meta content="${esc(p.excerpt)}" name="description"/><meta content="article" property="og:type"/>
<meta content="${esc(p.title)} - Mum Talks" property="og:title"/><meta content="${esc(p.excerpt)}" property="og:description"/>
<meta content="${esc(url)}" property="og:url"/><meta content="${esc(img)}" property="og:image"/>
<meta content="summary_large_image" name="twitter:card"/><link href="${esc(url)}" rel="canonical"/>
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`;
}

function send(res, code, html, cache) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', cache || 's-maxage=300, stale-while-revalidate=86400');
  res.end(html);
}

module.exports = async (req, res) => {
  const slug = String((req.query && req.query.slug) || '').replace(/[^a-z0-9-]/gi, '').toLowerCase();
  try {
    if (!slug) {
      let posts = [];
      try { posts = await wp('per_page=50&orderby=date'); } catch (e) { console.error('Blog list:', e.message); }
      const all = [...posts, ...STATIC_POSTS.filter((s) => !posts.some((p) => p.slug === s.slug))]
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      const cards = all.length
        ? card(all[0], true) + (all.length > 1 ? `\n<div class="mt-grid">\n${all.slice(1).map((p) => card(p)).join('\n')}\n</div>` : '')
        : '<p>New stories are coming soon.</p>';
      return send(res, 200, read('_templates/blog-index.html').replace('{{CARDS}}', cards));
    }

    // Hand-built posts win over WordPress.com posts with the same slug
    const file = path.join('blog', slug, 'index.html');
    if (fs.existsSync(path.join(ROOT, file))) return send(res, 200, read(file));

    const [post] = await wp(`slug=${enc(slug)}`);
    if (!post) return send(res, 404, read('404.html'), 's-maxage=60');
    const html = read('_templates/blog-post.html')
      .replace('{{TITLE}}', () => esc(post.title) + ' - Mum Talks')
      .replace('{{HEAD_META}}', () => headMeta(post))
      .replace('{{ARTICLE}}', () => article(post));
    return send(res, 200, html);
  } catch (e) {
    console.error('Blog error:', e.message);
    return send(res, 502, read('404.html'), 'no-store');
  }
};
