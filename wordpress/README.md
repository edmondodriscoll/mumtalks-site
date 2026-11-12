# Mum Talks_WordPress

This branch tracks the WordPress rebuild of Mum Talks. The `main` branch serves the original Vercel site.

## Source

- Vercel source site: https://mumtalks-site-nine.vercel.app/
- Source revision: `af9675b4f4fdeb3d74a686e2e60cd463d2ba83f2`
- WordPress rebuild: separate private WordPress.com preview

The root files are the original site's source and assets. WordPress.com stores the converted block content and site settings in its database. A checkout of this branch alone does not install the WordPress rebuild.

## Checks before launch

- Open the homepage and change the hero image in the WordPress editor. Preview the change before saving.
- Check desktop and mobile layouts, navigation, and internal URLs.
- Check blog posts, images, drafts, search, events, directory filtering, and booking links.
- Reconnect the forms to their intended handlers and verify submissions with an approved test destination.
- Review analytics, cookie consent, canonical URLs, and redirects before assigning a public domain.
