import fs from 'node:fs';
import path from 'node:path';
import { SITE_NAME, DEFAULT_TITLE, SITE_NAV, STATIC_PAGES, buildStore } from './pages.js';

/**
 * Build-time SEO for a client-rendered React app.
 *
 * Search engines and link-preview bots (WhatsApp, Facebook, LinkedIn, most AI
 * crawlers) read the raw HTML and often do not run JavaScript. This plugin
 * therefore writes a real HTML file for every public page into dist/:
 *
 *   dist/index.html                 prerendered home page
 *   dist/shop/index.html            prerendered static pages
 *   dist/listings/<slug>/index.html one per product (fetched from the API)
 *   dist/blog/<slug>/index.html     one per blog post (fetched from the API)
 *   dist/app-shell.html             generic SPA shell, the fallback for any other URL
 *
 * Each file carries its own <title>, description, canonical, Open Graph /
 * Twitter tags, JSON-LD and a plain-HTML copy of the page's main content
 * inside #root (React replaces it as soon as the app boots). robots.txt and
 * sitemap.xml are generated here too.
 *
 * Needs VITE_SITE_URL (absolute site URL) and, for product/blog pages,
 * VITE_API_URL. Set SEO_STRICT=1 to make the build FAIL if the API cannot be
 * reached, instead of silently shipping a sitemap with no products.
 */

const PRIVATE_PATHS = ['/admin', '/cart', '/checkout', '/profile', '/login', '/register', '/my-listings',
  '/post-listing', '/order-success', '/forgot-password', '/reset-password', '/account', '/settings'];

const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const stripHtml = (html = '') => String(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const jsonLdTag = (obj) =>
  `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;

function truncate(text, max = 158) {
  const t = stripHtml(text);
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).replace(/\s+\S*$/, '')}…`;
}

const rupees = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
const toDay = (d) => (d ? new Date(d).toISOString().slice(0, 10) : undefined);
const withBrand = (title) => (title.includes(SITE_NAME) ? title : `${title} — ${SITE_NAME}`);

/** Light safety net on top of the server-side sanitising already applied to blog HTML. */
const safeHtml = (html = '') =>
  String(html)
    .replace(/<(script|style|iframe|object|embed)[\s\S]*?<\/\1>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*')/gi, '');

/** Walks a paginated API endpoint. Never throws: reports { items, failed } instead. */
async function fetchAll(apiUrl, endpoint, key, limit) {
  const items = [];
  let failed = false;
  try {
    for (let page = 1; page <= 50; page += 1) {
      const res = await fetch(`${apiUrl.replace(/\/+$/, '')}${endpoint}?page=${page}&limit=${limit}`);
      if (!res.ok) {
        failed = true;
        break;
      }
      const body = await res.json();
      const data = body?.data ?? body;
      items.push(...(data?.[key] ?? []));
      if (page >= (data?.pagination?.totalPages ?? 1)) break;
    }
  } catch (err) {
    failed = true;
    console.warn(`[site-seo] could not fetch ${endpoint}: ${err.message}`);
  }
  return { items, failed };
}

async function fetchContent(apiUrl) {
  if (!apiUrl) return { listings: [], blogs: [], failed: false };
  const [l, b] = await Promise.all([
    fetchAll(apiUrl, '/listings', 'listings', 48),
    fetchAll(apiUrl, '/blogs', 'blogs', 24),
  ]);
  const failed = l.failed || b.failed;
  if (failed) {
    const msg = '[site-seo] API fetch failed — product/blog pages will be missing from sitemap.xml and the prerender.';
    if (process.env.SEO_STRICT === '1') throw new Error(msg);
    console.warn(`\n${msg}\n  (set SEO_STRICT=1 to fail the build instead)\n`);
  }
  return {
    listings: l.items.filter((x) => x.slug),
    blogs: b.items.filter((x) => x.slug),
    failed,
  };
}

/* ---------- HTML head helpers ---------- */

function replaceOrInsert(html, regex, tag) {
  return regex.test(html) ? html.replace(regex, () => tag) : html.replace('</head>', () => `    ${tag}\n  </head>`);
}
const metaName = (html, name, content) =>
  replaceOrInsert(html, new RegExp(`<meta\\s+name="${name}"[^>]*>`), `<meta name="${name}" content="${esc(content)}" />`);
const metaProp = (html, prop, content) =>
  replaceOrInsert(html, new RegExp(`<meta\\s+property="${prop}"[^>]*>`), `<meta property="${prop}" content="${esc(content)}" />`);

function renderPage(template, p) {
  let html = template;
  html = replaceOrInsert(html, /<title>[\s\S]*?<\/title>/, `<title>${esc(p.title)}</title>`);
  html = metaName(html, 'description', p.description);
  html = metaName(html, 'robots', 'index, follow, max-image-preview:large');
  html = html.replace(/\s*<meta\s+name="keywords"[^>]*>/, '');
  html = replaceOrInsert(html, /<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${esc(p.url)}" />`);
  html = metaProp(html, 'og:url', p.url);
  html = metaProp(html, 'og:type', p.ogType ?? 'website');
  html = metaProp(html, 'og:title', p.title);
  html = metaProp(html, 'og:description', p.description);
  html = metaProp(html, 'og:image', p.image);
  html = metaName(html, 'twitter:title', p.title);
  html = metaName(html, 'twitter:description', p.description);
  html = metaName(html, 'twitter:image', p.image);
  html = html.replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '');
  const ld = (p.jsonLd ?? []).map(jsonLdTag).join('\n    ');
  if (ld) html = html.replace('</head>', () => `    ${ld}\n  </head>`);
  if (p.preloadImage) html = html.replace('</head>', () => `    <link rel="preload" as="image" href="${esc(p.preloadImage)}" fetchpriority="high" />\n  </head>`);
  return html.replace('<div id="root"></div>', () => `<div id="root">${p.body}</div>`);
}

/* ---------- Page models ---------- */

function breadcrumb(base, items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: `${base}${it.path}`,
    })),
  };
}

function navHtml() {
  return `<nav aria-label="Main"><ul>${SITE_NAV.map(([to, label]) => `<li><a href="${to}">${esc(label)}</a></li>`).join('')}</ul></nav>`;
}

function listingLinks(listings, max = 48) {
  if (!listings.length) return '';
  return `<section><h2>Products</h2><ul>${listings
    .slice(0, max)
    .map((l) => `<li><a href="/listings/${esc(l.slug)}">${esc(l.title)}</a>${l.price != null ? ` — ${rupees(l.price)}` : ''}</li>`)
    .join('')}</ul></section>`;
}

function blogLinks(blogs, max = 48) {
  if (!blogs.length) return '';
  return `<section><h2>Guides &amp; articles</h2><ul>${blogs
    .slice(0, max)
    .map((b) => `<li><a href="/blog/${esc(b.slug)}">${esc(b.title)}</a>${b.excerpt ? ` — ${esc(b.excerpt)}` : ''}</li>`)
    .join('')}</ul></section>`;
}

function buildPages({ base, listings, blogs, store, imageDefault }) {
  const pages = [];
  const storeSchema = {
    '@context': 'https://schema.org',
    '@type': 'PetStore',
    '@id': `${base}/#store`,
    name: store.name,
    url: base,
    image: imageDefault,
    logo: imageDefault,
    telephone: store.phones[0],
    email: store.email,
    address: store.address,
    openingHoursSpecification: store.openingHours,
    areaServed: 'IN',
  };
  const orgSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: base,
    logo: imageDefault,
    contactPoint: store.phones.map((t) => ({ '@type': 'ContactPoint', telephone: t, contactType: 'customer service', areaServed: 'IN' })),
  };
  const siteSchema = { '@context': 'https://schema.org', '@type': 'WebSite', name: SITE_NAME, url: base };

  /* Static pages */
  for (const sp of STATIC_PAGES) {
    const description =
      sp.description ??
      `Find our physical retail store at ${store.address.streetAddress}, ${store.address.addressLocality}. View opening hours, directions, and visit information.`;
    const url = `${base}${sp.path === '/' ? '/' : sp.path}`;
    const jsonLd = [];
    if (sp.path === '/') jsonLd.push(orgSchema, siteSchema);
    if (sp.schema === 'store') jsonLd.push(storeSchema);
    if (sp.path !== '/') jsonLd.push(breadcrumb(base, [{ name: 'Home', path: '/' }, { name: sp.h1, path: sp.path }]));
    pages.push({
      path: sp.path,
      title: sp.path === '/' ? sp.title : withBrand(sp.title),
      description,
      url,
      image: imageDefault,
      preloadImage: sp.path === '/' ? '/goat-hero.jpeg' : undefined,
      jsonLd,
      body:
        `<main class="seo-static"><h1>${esc(sp.h1)}</h1><p>${esc(sp.intro)}</p>` +
        (sp.showProducts ? listingLinks(listings) : '') +
        (sp.showBlogs ? blogLinks(blogs, 12) : '') +
        `${navHtml()}</main>`,
    });
  }

  /* Product pages */
  for (const l of listings) {
    const images = (l.images ?? []).map((i) => i.url).filter(Boolean);
    const isAnimals = Boolean(l.AnimalsType);
    const inStock = isAnimals ? l.status !== 'sold' : (l.stockQuantity ?? 1) > 0;
    const detail = isAnimals
      ? [l.AnimalsType, l.breed].filter(Boolean).join(', ') || l.category
      : l.category;
    const title = `${l.title}${l.price != null ? ` · ${rupees(l.price)}` : ''}`;
    const description = truncate(`${l.title} — ${detail} in ${l.location}. ${stripHtml(l.description)}`);
    const url = `${base}/listings/${l.slug}`;
    pages.push({
      path: `/listings/${l.slug}`,
      title: withBrand(title),
      description,
      url,
      image: images[0] ?? imageDefault,
      ogType: 'product',
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: l.title,
          description: stripHtml(l.description).slice(0, 500),
          image: images.length ? images : undefined,
          category: l.category,
          ...(l.breed ? { brand: { '@type': 'Brand', name: l.breed } } : {}),
          offers: {
            '@type': 'Offer',
            url,
            priceCurrency: 'INR',
            price: l.price,
            availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            itemCondition: 'https://schema.org/NewCondition',
            seller: { '@type': 'Organization', name: SITE_NAME },
          },
        },
        breadcrumb(base, [
          { name: 'Home', path: '/' },
          { name: 'Shop', path: '/shop' },
          { name: l.title, path: `/listings/${l.slug}` },
        ]),
      ],
      body:
        `<main class="seo-static"><h1>${esc(l.title)}</h1>` +
        `<p>${l.price != null ? `<strong>${rupees(l.price)}</strong> · ` : ''}${esc(detail ?? '')}${l.location ? ` · ${esc(l.location)}` : ''}</p>` +
        `<p>${esc(stripHtml(l.description))}</p>` +
        `<p><a href="/shop">← Back to shop</a></p>${navHtml()}</main>`,
      lastmod: toDay(l.updatedAt),
      sitemapImages: images.slice(0, 5),
    });
  }

  /* Blog posts */
  for (const b of blogs) {
    const url = `${base}/blog/${b.slug}`;
    const image = b.coverImage?.url || imageDefault;
    pages.push({
      path: `/blog/${b.slug}`,
      title: withBrand(b.title),
      description: truncate(b.excerpt || b.content),
      url,
      image,
      ogType: 'article',
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: b.title,
          description: b.excerpt,
          image: b.coverImage?.url ? [b.coverImage.url] : undefined,
          datePublished: b.publishedAt || b.createdAt,
          dateModified: b.updatedAt || b.publishedAt || b.createdAt,
          mainEntityOfPage: url,
          author: { '@type': 'Organization', name: SITE_NAME },
          publisher: { '@type': 'Organization', name: SITE_NAME, logo: { '@type': 'ImageObject', url: imageDefault } },
        },
        breadcrumb(base, [
          { name: 'Home', path: '/' },
          { name: 'Blog', path: '/blog' },
          { name: b.title, path: `/blog/${b.slug}` },
        ]),
      ],
      body:
        `<main class="seo-static"><article><h1>${esc(b.title)}</h1>` +
        `<p>${esc(b.excerpt ?? '')}</p>${safeHtml(b.content)}</article>` +
        `<p><a href="/blog">← All articles</a></p>${navHtml()}</main>`,
      lastmod: toDay(b.updatedAt || b.publishedAt),
      sitemapImages: b.coverImage?.url ? [b.coverImage.url] : [],
    });
  }

  return pages;
}

/* ---------- The plugin ---------- */

export default function siteSeoPlugin(siteUrl, apiUrl, envVars = {}) {
  const base = siteUrl.replace(/\/+$/, '');
  const imageDefault = `${base}/icon-512.png`;
  let outDir;
  let contentPromise;
  const content = () => (contentPromise ??= fetchContent(apiUrl));

  return {
    name: 'site-seo',
    apply: 'build',

    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },

    // Only the defaults every page shares. Per-page canonical / og:url / JSON-LD
    // are written by closeBundle below; the shell must NOT claim "/" as canonical.
    transformIndexHtml(html) {
      if (!base) return html;
      return html
        .replace(/\s*<meta\s+name="keywords"[^>]*>/, '')
        .replace(
          '</head>',
          `    <meta property="og:image" content="${imageDefault}" />\n    <meta name="twitter:image" content="${imageDefault}" />\n  </head>`
        );
    },

    async generateBundle() {
      const robots = ['User-agent: *', 'Allow: /', ...PRIVATE_PATHS.map((p) => `Disallow: ${p}`)];
      if (base) robots.push('', `Sitemap: ${base}/sitemap.xml`);
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots.join('\n') + '\n' });
      if (!base) return;

      const { listings, blogs } = await content();
      const day = new Date().toISOString().slice(0, 10);
      const entries = [
        ...STATIC_PAGES.map((p) => ({ path: p.path, lastmod: day })),
        ...listings.map((l) => ({ path: `/listings/${l.slug}`, lastmod: toDay(l.updatedAt), images: (l.images ?? []).map((i) => i.url).filter(Boolean).slice(0, 5) })),
        ...blogs.map((b) => ({ path: `/blog/${b.slug}`, lastmod: toDay(b.updatedAt || b.publishedAt), images: b.coverImage?.url ? [b.coverImage.url] : [] })),
      ];
      const urls = entries
        .map(({ path: p, lastmod, images = [] }) =>
          `  <url><loc>${base}${esc(p)}</loc><lastmod>${lastmod || day}</lastmod>${images
            .map((src) => `<image:image><image:loc>${esc(src)}</image:loc></image:image>`)
            .join('')}</url>`)
        .join('\n');
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls}\n</urlset>\n`,
      });
    },

    async closeBundle() {
      if (!outDir) return;
      if (!base) {
        console.warn('[site-seo] VITE_SITE_URL is not set — skipping prerender, canonical tags and sitemap.xml.');
        return;
      }
      const indexFile = path.join(outDir, 'index.html');
      if (!fs.existsSync(indexFile)) return;

      const { listings, blogs } = await content();
      const shell = fs.readFileSync(indexFile, 'utf8');
      // Generic fallback for URLs with no prerendered file (new products, search URLs…).
      fs.writeFileSync(path.join(outDir, 'app-shell.html'), shell);

      const pages = buildPages({ base, listings, blogs, store: buildStore(envVars), imageDefault });
      for (const p of pages) {
        const file = p.path === '/' ? indexFile : path.join(outDir, p.path, 'index.html');
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, renderPage(shell, p));
      }
      console.log(`[site-seo] prerendered ${pages.length} pages (${listings.length} products, ${blogs.length} posts)`);
    },
  };
}

export { DEFAULT_TITLE };
