# Mum Talks – static website

A self-hosted copy of mumtalks.ie (captured 11 Nov 2026) with a new **Blog** section.
It needs no WordPress, database or build step: it's plain HTML, CSS and JS.

## What's here

| Path | What it is |
|---|---|
| `index.html`, `upcoming-events/`, `event/…`, `directory/`, `about-us/` … | Every page of the live site |
| `blog/` | Blog index and posts. Add more in `blog.py` in the build tools, or copy a post folder |
| `wp-content/`, `_img/`, `_wp/` | The theme, plugin assets and all images (stored locally) |
| `mt-static/` | Scripts that replace the WordPress server features: event and directory filters, forms, blog styles |
| `search/` + `search-index.json` | Site search (runs in the browser) |
| `forms/submit.php` + `forms/config.php` | Form handler for ordinary PHP hosting |
| `api/submit.js` + `vercel.json` | Form handler for Vercel (replaces the PHP one automatically) |

## How things work now

- **Event filters** (tags, location, date, A–Z) and **Directory categories** filter in the browser and keep the same `?category=…&location=…` URLs.
- **Newsletter + contact forms** post to `/forms/submit.php`. On Vercel that address is routed to `api/submit.js`.
- **Ticket booking** still uses your Ticket Tailor widgets, which work anywhere.
- **Fonts** come from your Adobe Fonts (Typekit) kit `bxp1foc`. Add any new domain (e.g. `*.vercel.app`) in Adobe Fonts > Web Projects, or the headings fall back to a system font.
- **Cookiebot, Google Tag Manager, Clarity and Gauges** are kept. Add new domains in each dashboard if you use them.

## Deploying on Vercel
Import the repo in Vercel (Framework preset: **Other**, no build command, output = root). Then add environment variables:

- `RESEND_API_KEY`: a free key from resend.com, so form submissions get emailed to you
- `TO_EMAIL` (default `hello@mumtalks.ie`), `FROM_EMAIL` (an address on a domain verified in Resend)
- `MAILCHIMP_API_KEY`, `MAILCHIMP_LIST_ID`: optional, adds newsletter sign-ups to Mailchimp

Without those keys, submissions still succeed and appear in **Vercel > Logs**.

## Deploying on normal hosting (Blacknight, cPanel, etc.)
Upload everything to `public_html`. Edit `forms/config.php` (email + optional Mailchimp).
Submissions are also saved in `forms/data/submissions.csv`, which is blocked from public access.

## Updating events
Event pages are HTML. To add an event, copy a folder in `event/` and edit the text, then add a card to
`upcoming-events/index.html` (copy an existing `<div class="… event_list …">` block, keeping the event-type class such as `mum-talks-meetups`, `bump-talks`, `baby-club` or `teen-talks`).
