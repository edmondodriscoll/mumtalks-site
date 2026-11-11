#!/usr/bin/env python3
"""Turn the captured mumtalks.ie snapshot into a self-hostable static site."""
import json, os, re, shutil, html, hashlib, sys
from urllib.parse import urlsplit, unquote
from bs4 import BeautifulSoup, Comment

CAP = sys.argv[1]            # .../mumtalks-capture
OUT = sys.argv[2]            # output site dir
STATIC = sys.argv[3]         # dir with mt-static, forms, blog sources

amap = json.load(open(os.path.join(CAP, 'manifest/assets.json')))
pages = json.load(open(os.path.join(CAP, 'manifest/pages.json')))

if os.path.exists(OUT):
    shutil.rmtree(OUT)
os.makedirs(OUT)

EMAILS = {}  # filled from emails.json
EMAILS = json.load(open(os.path.join(STATIC, 'emails.json')))

# ---------- 1. place assets ----------
url2local = {}
used = set()
for url, saved in amap.items():
    u = urlsplit(url)
    path = unquote(u.path)
    if u.netloc == 'mumtalks.ie':
        local = path
    elif u.netloc == 'c0.wp.com':
        local = '/_wp' + path
    elif u.netloc == 'i0.wp.com':
        local = '/_img' + path[len('/mumtalks.ie'):] if path.startswith('/mumtalks.ie') else '/_img' + path
    else:
        continue
    if u.query:
        if u.netloc == 'i0.wp.com':
            stem, ext = os.path.splitext(local)
            h = hashlib.md5(u.query.encode()).hexdigest()[:8]
            local = f'{stem}-{h}{ext}'
        elif local in used:
            stem, ext = os.path.splitext(local)
            local = f'{stem}-{hashlib.md5(u.query.encode()).hexdigest()[:6]}{ext}'
    if local.endswith('/'):
        local += 'index'
    used.add(local)
    url2local[url] = local
    dst = os.path.join(OUT, local.lstrip('/'))
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copyfile(os.path.join(CAP, saved), dst)

def lookup(raw):
    """raw absolute URL -> local root-relative path (or None)."""
    u = html.unescape(raw).replace('&#038;', '&')
    for cand in (u, u.split('#')[0]):
        if cand in url2local:
            return url2local[cand]
    base = u.split('#')[0].split('?')[0]
    for k, v in url2local.items():
        if k.split('?')[0] == base:
            return v
    return None

URL_RE = re.compile(r'https?://(?:mumtalks\.ie|i0\.wp\.com|c0\.wp\.com)(?:/[^\s"\'<>)\\,]*)?')

def rewrite_urls(text):
    # JSON-escaped occurrences first
    text = text.replace('https:\\/\\/mumtalks.ie\\/', '\\/').replace('https:\\/\\/mumtalks.ie', '')
    def sub(m):
        raw = m.group(0)
        loc = lookup(raw)
        if loc:
            return loc
        u = urlsplit(html.unescape(raw))
        if u.netloc == 'mumtalks.ie':
            p = u.path or '/'
            q = ('?' + u.query) if u.query else ''
            f = ('#' + u.fragment) if u.fragment else ''
            return p + q + f
        return raw
    return URL_RE.sub(sub, text)

# ---------- 2. CSS: rewrite absolute URLs ----------
for url, local in url2local.items():
    if local.endswith('.css'):
        p = os.path.join(OUT, local.lstrip('/'))
        t = open(p, encoding='utf-8', errors='replace').read()
        t2 = rewrite_urls(t)
        if t2 != t:
            open(p, 'w', encoding='utf-8').write(t2)

# ---------- 3. pages ----------
DROP_SCRIPT_SRC = ('cleantalk', 'googletagmanager', 'stats.wp.com', 'recaptcha', 'akismet',
                   'contact-form-7', 'swv/js', 'wp-polyfill')
DROP_INLINE = ('gtag(', '_stq', 'wpcf7', 'ctPublic', 'apbct', 'akismet', 'recaptcha', 'wpcf7_recaptcha',
               'wpemaddon', 'jetpack', 'ak_js_', 'wpemojiSettings')
DROP_LINK_REL = ('alternate', 'EditURI', 'wlwmanifest', 'shortlink', 'https://api.w.org/', 'dns-prefetch', 'pingback')

def blog_menu_item(soup):
    li = soup.new_tag('li', attrs={'class': 'menu-item menu-item-blog'})
    a = soup.new_tag('a', href='/blog/')
    a.string = 'Blog'
    li.append(a)
    return li

def process_page(src_html, page_path):
    t = rewrite_urls(src_html)
    s = BeautifulSoup(t, 'html.parser')
    # remove WP head cruft & trackers
    for l in s.find_all('link'):
        rel = ' '.join(l.get('rel') or [])
        if any(r in rel for r in DROP_LINK_REL):
            l.decompose()
    for sc in s.find_all('script'):
        src = sc.get('src') or ''
        body = sc.string or ''
        if src and any(d in src for d in DROP_SCRIPT_SRC):
            sc.decompose(); continue
        if not src and sc.get('type') != 'application/ld+json' and any(d in body for d in DROP_INLINE):
            sc.decompose(); continue
    for l in s.find_all('link', href=True):
        if 'cleantalk' in l['href']:
            l.decompose()
    for c in s.find_all(string=lambda x: isinstance(x, Comment)):
        c.extract()
    # spam-plugin hidden fields
    for el in s.select('input[name=ct_checkjs_cf7], input[name=apbct__email_id__wp_contact_form_7], '
                       'textarea[name=_wpcf7_ak_hp_textarea], input[name=_wpcf7_ak_js], '
                       'input[name=_wpcf7_recaptcha_response], .apbct_special_field, .wpcf7-recaptcha'):
        p = el.find_parent('p') if el.name != 'p' else None
        el.decompose()
    # decode CleanTalk-protected emails
    for e in s.select('.apbct-email-encoder'):
        email = EMAILS.get(e.get('data-original-string'), None)
        if not email:
            continue
        a = e.find_parent('a')
        if a and a.get('href', '').startswith('mailto:'):
            a['href'] = 'mailto:' + email
        e.replace_with(email)
    # search forms -> static search page
    for f in s.find_all('form'):
        if f.find('input', attrs={'name': 's'}):
            f['action'] = '/search/'
    # CF7 forms -> our handler
    for f in s.select('form.wpcf7-form'):
        f['action'] = '/forms/submit.php'
        f['data-mt-form'] = '1'
        f['class'] = [c for c in f.get('class', []) if c != 'init'] + ['init']
    # nav: add Blog to desktop + mobile menus and footer
    for ul in s.select('.menu-main-menu-container > ul.menu, .menu-mobile-menu-container > ul.menu'):
        if not ul.select_one('.menu-item-blog'):
            ul.append(blog_menu_item(s))
    for menu in s.select('.footer-menu'):
        h5 = menu.find('h5')
        if h5 and h5.get_text(strip=True) == 'Connect':
            ul = menu.find('ul')
            if ul and not ul.find('a', href='/blog/'):
                li = s.new_tag('li'); a = s.new_tag('a', href='/blog/'); a.string = 'Blog'; li.append(a); ul.append(li)
    # inject static helpers
    head = s.head
    head.append(BeautifulSoup('<link rel="stylesheet" href="/mt-static/static.css">', 'html.parser'))
    s.body.append(BeautifulSoup('<script src="/mt-static/static.js"></script>', 'html.parser'))
    return s

page_soups = {}
for url in pages:
    path = urlsplit(url).path
    src = open(os.path.join(CAP, 'pages' + path + 'index.html'), encoding='utf-8').read()
    s = process_page(src, path)
    page_soups[path] = s

# alias paths used in menus that were redirects on the live site
ALIASES = {'/event_listing_type/mum-talks-meetups/': '/event-type/mum-talks-meetups/'}
for a, target in ALIASES.items():
    if a not in page_soups and target in page_soups:
        page_soups[a] = BeautifulSoup(str(page_soups[target]), 'html.parser')

# ---------- 4. search index ----------
index = []
for path, s in page_soups.items():
    if path in ALIASES:
        continue
    title = (s.title.get_text() if s.title else path).replace(' - Mum Talks', '').strip()
    if path.startswith('/event/'):
        h1 = s.select_one('h1')
        if h1:
            name = (h1.find(string=True, recursive=False) or '').strip()
            date = h1.select_one('ul li')
            title = name + (' – ' + date.get_text(strip=True) if date else '')
    if path.startswith('/event_listing_type/'):
        continue
    main = s.select_one('#page') or s.body
    clone = BeautifulSoup(str(main), 'html.parser')
    for x in clone.select('header, footer, script, style, .get-empowered, .mt-newsletter-popup-backdrop, form.wpcf7-form'):
        x.decompose()
    text = re.sub(r'\s+', ' ', clone.get_text(' ')).strip()
    index.append({'t': title, 'u': path, 'x': text[:4000]})

# ---------- 5. write pages ----------
def write(path, soup_or_html):
    d = os.path.join(OUT, path.lstrip('/'))
    os.makedirs(d, exist_ok=True)
    open(os.path.join(d, 'index.html'), 'w', encoding='utf-8').write(str(soup_or_html))

for path, s in page_soups.items():
    write(path, s)

# ---------- 6. template-based pages (search, blog, 404) ----------
tpl_src = str(page_soups['/privacy-policy/'])

def from_template(title, description, inner_html, extra_head=''):
    s = BeautifulSoup(tpl_src, 'html.parser')
    s.title.string = f'{title} - Mum Talks'
    for m in s.find_all('meta'):
        if m.get('name') == 'description' or m.get('property') in ('og:description',):
            m['content'] = description
        if m.get('property') == 'og:title':
            m['content'] = f'{title} - Mum Talks'
        if m.get('property') == 'og:url' or m.get('name') == 'robots':
            pass
    for sc in s.find_all('script', type='application/ld+json'):
        sc.decompose()
    for l in s.find_all('link', rel='canonical'):
        l.decompose()
    sec = s.select_one('section.t-and-c')
    new = BeautifulSoup(inner_html, 'html.parser')
    sec.replace_with(new)
    if extra_head:
        s.head.append(BeautifulSoup(extra_head, 'html.parser'))
    return s

json.dump({'index': index}, open(os.path.join(OUT, 'search-index.json'), 'w'))

shutil.copytree(os.path.join(STATIC, 'mt-static'), os.path.join(OUT, 'mt-static'))
shutil.copytree(os.path.join(STATIC, 'forms'), os.path.join(OUT, 'forms'))

search_html = open(os.path.join(STATIC, 'search.html')).read()
write('/search/', from_template('Search', 'Search Mum Talks', search_html))

nf = open(os.path.join(STATIC, '404.html')).read()
open(os.path.join(OUT, '404.html'), 'w').write(str(from_template('Page not found', 'Page not found', nf)))

# blog
sys.path.insert(0, STATIC)
import blog
posts = blog.POSTS
blog_head = '<link rel="stylesheet" href="/mt-static/blog.css">'
for p in posts:
    page = from_template(p['title'], p['excerpt'], blog.render_post(p, posts), blog_head + blog.post_meta(p))
    write('/blog/' + p['slug'] + '/', page)
    index.append({'t': p['title'], 'u': '/blog/' + p['slug'] + '/', 'x': re.sub(r'<[^>]+>', ' ', p['body'])[:4000]})
write('/blog/', from_template('Blog', 'Stories, honesty and support for mums from the Mum Talks community.',
                              blog.render_index(posts), blog_head))
json.dump({'index': index}, open(os.path.join(OUT, 'search-index.json'), 'w'))
os.makedirs(os.path.join(OUT, 'blog-images'), exist_ok=True)
for f in os.listdir(os.path.join(STATIC, 'blog-images')):
    shutil.copyfile(os.path.join(STATIC, 'blog-images', f), os.path.join(OUT, 'blog-images', f))

for f in ('.htaccess', 'README.md', 'robots.txt', 'vercel.json'):
    if os.path.exists(os.path.join(STATIC, 'root', f)):
        shutil.copyfile(os.path.join(STATIC, 'root', f), os.path.join(OUT, f))

os.makedirs(os.path.join(OUT, 'api'), exist_ok=True)
shutil.copyfile(os.path.join(STATIC, 'root', 'vercel-api-submit.js'), os.path.join(OUT, 'api', 'submit.js'))

# sitemap
urls = sorted(set([p for p in page_soups if p not in ALIASES] + ['/blog/'] + ['/blog/' + p['slug'] + '/' for p in posts]))
sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + \
     ''.join(f'  <url><loc>https://mumtalks.ie{u}</loc></url>\n' for u in urls) + '</urlset>\n'
open(os.path.join(OUT, 'sitemap.xml'), 'w').write(sm)
print('pages', len(page_soups) + 3 + len(posts), 'assets', len(url2local))
