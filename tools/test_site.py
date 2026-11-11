import asyncio, sys, json
from playwright.async_api import async_playwright
BASE = 'http://127.0.0.1:8080'
OUT = '/tmp/shots'
import os; os.makedirs(OUT, exist_ok=True)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        ctx = await b.new_context(viewport={'width': 1366, 'height': 900})
        # suppress newsletter popup for screenshots except one test
        await ctx.add_init_script("try{localStorage.setItem('mt_newsletter_popup_seen',String(Date.now()))}catch(e){}")
        page = await ctx.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(('pageerror', page.url, str(e)[:200])))
        page.on('console', lambda m: m.type == 'error' and errors.append(('console', page.url, m.text[:200])))
        failed = []
        page.on('requestfailed', lambda r: failed.append((r.url[:120], r.failure)))
        page.on('response', lambda r: r.status >= 400 and r.url.startswith(BASE) and failed.append((r.url[:120], r.status)))

        for path in sys.argv[1:]:
            await page.goto(BASE + path, wait_until='networkidle')
            await page.wait_for_timeout(800)
            name = path.strip('/').replace('/', '_') or 'home'
            await page.screenshot(path=f'{OUT}/{name}.png', full_page=False)

        # ---- filters on upcoming events
        await page.goto(BASE + '/upcoming-events/', wait_until='networkidle')
        vis = lambda: page.evaluate("[...document.querySelectorAll('.event_list')].filter(e=>e.offsetParent).length")
        r = {'all': await vis()}
        await page.click('label:has(#baby-club), #baby-club', force=True) if await page.query_selector('#baby-club') else None
        await page.wait_for_timeout(300)
        r['baby_club'] = await vis(); r['url'] = page.url
        await page.goto(BASE + '/upcoming-events/?location=Galway', wait_until='networkidle'); r['galway'] = await vis()
        await page.goto(BASE + '/upcoming-events/?order=DESC', wait_until='networkidle')
        r['desc_first'] = await page.evaluate("[...document.querySelectorAll('.event_list')].filter(e=>e.offsetParent).map(e=>e.querySelector('.title-sec').innerText.replace(/\\n/g,' '))")
        await page.goto(BASE + '/upcoming-events/?filter_date=2026-11-26', wait_until='networkidle'); r['nov26'] = await vis()
        # ---- directory
        await page.goto(BASE + '/directory/', wait_until='networkidle')
        dvis = lambda: page.evaluate("[...document.querySelectorAll('.dir_items')].filter(e=>e.offsetParent).length")
        r['dir_initial'] = await dvis()
        await page.evaluate("document.querySelector('.directory-cards .loadMoreBtn')&&document.querySelector('.directory-cards .loadMoreBtn').click()")
        await page.wait_for_timeout(900); r['dir_after_loadmore'] = await dvis()
        cb = await page.evaluate("[...document.querySelectorAll('.filter-directory_options')].map(c=>c.value).filter(Boolean).slice(0,3)")
        await page.goto(BASE + '/directory/?category=' + cb[1], wait_until='networkidle'); r['dir_cat'] = (cb[1], await dvis())
        # ---- search
        await page.goto(BASE + '/search/?s=galway', wait_until='networkidle'); await page.wait_for_timeout(500)
        r['search'] = await page.evaluate("[...document.querySelectorAll('#mt-results li a')].map(a=>a.textContent).slice(0,5)")
        await page.screenshot(path=f'{OUT}/search.png')
        # ---- contact form
        await page.goto(BASE + '/contact/', wait_until='networkidle')
        f = 'form[data-mt-form][action="/forms/submit.php"] >> nth=0'
        await page.evaluate("document.querySelector('form[data-mt-form] input[type=submit]').click()")
        await page.wait_for_timeout(400)
        r['contact_invalid'] = await page.evaluate("document.querySelector('form[data-mt-form]').className")
        await page.fill('form[data-mt-form] input[name=surname]', 'Test Person')
        await page.fill('form[data-mt-form] input[name=email]', 'test@example.com')
        await page.fill('form[data-mt-form] textarea[name=Message]', 'Hello from the test')
        await page.evaluate("document.querySelector('form[data-mt-form] input[type=submit]').click()")
        await page.wait_for_timeout(1500)
        r['contact_sent'] = await page.evaluate("[document.querySelector('form[data-mt-form]').className, document.querySelector('form[data-mt-form] .wpcf7-response-output').textContent]")
        await page.screenshot(path=f'{OUT}/contact_sent.png')
        # ---- newsletter popup
        ctx2 = await b.new_context(viewport={'width': 1366, 'height': 900})
        p2 = await ctx2.new_page()
        await p2.goto(BASE + '/about-us/', wait_until='networkidle'); await p2.wait_for_timeout(3200)
        r['popup_visible'] = await p2.evaluate("document.getElementById('mt-newsletter-popup-backdrop')?.classList.contains('is-visible')")
        await p2.screenshot(path=f'{OUT}/popup.png')
        await p2.fill('#mt-newsletter-popup-backdrop input[name=email]', 'mum@example.com')
        await p2.evaluate("document.querySelector('#mt-newsletter-popup-backdrop input[type=submit]').click()")
        await p2.wait_for_timeout(1500)
        r['popup_sent'] = await p2.evaluate("document.querySelector('#mt-newsletter-popup-backdrop .wpcf7-response-output').textContent")
        # ---- mobile
        m = await b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
        await m.add_init_script("try{localStorage.setItem('mt_newsletter_popup_seen',String(Date.now()))}catch(e){}")
        mp = await m.new_page()
        for path in ['/', '/blog/when-your-brother-is-the-favourite-child/']:
            await mp.goto(BASE + path, wait_until='networkidle'); await mp.wait_for_timeout(800)
            await mp.screenshot(path=f'{OUT}/m_{path.strip("/").replace("/","_") or "home"}.png', full_page=True)
        await mp.goto(BASE + '/', wait_until='networkidle')
        await mp.click('.mobile-menu-button'); await mp.wait_for_timeout(700)
        r['mobile_menu_open'] = await mp.evaluate("document.querySelector('#site-navigation').classList.contains('is-open')")
        await mp.screenshot(path=f'{OUT}/m_menu.png')
        print(json.dumps(r, indent=1))
        print('PAGEERR', [e for e in errors if e[0]=='pageerror' or ('ERR_' not in e[2] and 'Failed to load' not in e[2])])
        print('FAILED', json.dumps(failed[:40], indent=1))
        await b.close()
asyncio.run(main())
