# SEO notes

## How it works
`npm run build` runs `seo/siteSeoPlugin.js`. It fetches all products and blog posts from the API and writes
real HTML for every public page into `dist/`: its own title, description, canonical, Open Graph / Twitter
tags, JSON-LD and a plain-HTML copy of the content. It also writes `robots.txt` and `sitemap.xml`.
React replaces that HTML when the app loads. Any URL without a prerendered file falls back to
`dist/app-shell.html` (see `vercel.json`), and the page's `useSEO()` sets the tags in the browser.

## Keeping it fresh (automatic)
Products and posts are baked in at BUILD time, so a rebuild is needed when content changes. This is automated:
1. **Instant:** in Vercel, open the FRONTEND project -> Settings -> Git -> Deploy Hooks, create a hook, and set its URL as
   `VERCEL_DEPLOY_HOOK_URL` in the API (server) project. After that, every successful create/update/delete of a
   listing or blog post triggers a rebuild (`server/middleware/rebuildOnContentChange.js`).
2. **Nightly backup:** `.github/workflows/daily-rebuild.yml` calls the same hook at 02:00 IST. Add the hook URL as the
   GitHub secret `VERCEL_DEPLOY_HOOK_URL`.

## When you edit a static page's title or description
Update both the page's `useSEO()` call and `seo/pages.js` (link-preview bots read the latter).
If the store address or opening hours change, update `src/constants/contact.js` and `buildStore()` in `seo/pages.js`.

## URLs
* `/listings/:slug` is the single canonical product URL; `/shop/:slug` and `/listings` redirect (301 in `vercel.json`, plus in the React router).
* Unknown product slugs are marked `noindex` in the browser.

## After the first deploy
1. Google Search Console: add the domain and submit `https://<site>/sitemap.xml`.
2. Check a product URL with URL Inspection and the Rich Results Test (Product and Breadcrumb).
3. Share a product link in WhatsApp and confirm the preview shows the product title and image.
4. Create a Google Business Profile for the Lucknow store (matches the PetStore schema).

## Search / filter pages
`/shop?q=...`, filtered and page-2+ URLs are `noindex, follow` (they duplicate the main page). Product pages are never
noindexed because of a temporary API error, only on a real 404.
