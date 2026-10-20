/**
 * Final V1 smoke test — exercises the full API surface against a freshly
 * seeded database.
 *
 *   npm run seed && node src/scripts/smokeTest.js
 *
 * Prerequisites:
 *   - The API is running (default http://localhost:5000).
 *   - `npm run seed` has just been run (counts and slugs assume seed data).
 *
 * The script MUTATES the database (creates a test user, a test blog, sells /
 * archives / deletes listings, files reports). Re-run `npm run seed` afterwards
 * to restore the demo data.
 *
 * Because it is destructive, a guard refuses to start against a remote
 * database or API that does not look like a test target — see
 * `assertSafeTarget` below.
 *
 * Image-upload steps accept either success (201/200) or the clear 503 that
 * the server returns when Cloudinary credentials are not configured — so the
 * suite is useful before AND after Cloudinary is set up.
 */
import mongoose from 'mongoose';
import { env } from '../config/env.js';

const API = process.env.SMOKE_API_URL ?? `http://localhost:${process.env.PORT ?? 5000}/api`;

/**
 * This suite MUTATES whatever database the API under test points at: it
 * registers users, creates blogs, sells/archives/deletes listings, files
 * reports, and overwrites `stockQuantity` directly through the driver.
 *
 * The guard below refuses to start unless the target looks disposable, using
 * configuration rather than data: the environment, the Mongo host and
 * database name, and the API target. A target qualifies when its database
 * name carries a test marker (…-qa, …-test, …-smoke, …-scratch) AND the API it
 * talks to is local. An explicit override exists for unusual setups:
 *
 *   SMOKE_ALLOW_DESTRUCTIVE=true npm run smoke
 *
 * NODE_ENV=production is never overridable — there is no legitimate reason to
 * run a mutating suite in production mode.
 *
 * A localhost database is deliberately NOT enough on its own: a developer's
 * local database is exactly where irreplaceable data tends to live, and
 * "it's only localhost" is how that data gets destroyed.
 */
const LOCAL_HOST = /(^|\/\/)(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i;
const TEST_MARKER = /(^|[-_/])(test|tests|qa|smoke|scratch|staging|demo)([-_/]|$)/i;

/** Splits a Mongo URI into { host, database } without pulling in a parser. */
function describeMongoTarget(uri) {
  const withoutQuery = uri.split('?')[0];
  const afterScheme = withoutQuery.replace(/^mongodb(\+srv)?:\/\//i, '');
  const slash = afterScheme.indexOf('/');
  const authority = slash === -1 ? afterScheme : afterScheme.slice(0, slash);
  const database = slash === -1 ? '' : afterScheme.slice(slash + 1);
  // Strip any user:password@ prefix.
  return { host: authority.split('@').pop(), database };
}

function assertSafeTarget() {
  const { host, database } = describeMongoTarget(env.mongoUri);
  const isLocalDb = LOCAL_HOST.test(host);
  const isLocalApi = LOCAL_HOST.test(API);
  const override = process.env.SMOKE_ALLOW_DESTRUCTIVE === 'true';

  const blockers = [];
  if (env.isProduction) {
    blockers.push('NODE_ENV=production (this suite mutates data and never runs in production mode)');
  }
  if (!override) {
    if (!TEST_MARKER.test(database)) {
      blockers.push(
        `MONGO_URI targets "${database || '(default)'}" on ${host}, whose name carries no test marker` +
          (isLocalDb ? ' (a localhost database is not automatically disposable)' : '')
      );
    }
    if (!isLocalApi) {
      blockers.push(`SMOKE_API_URL targets the non-local API ${API}`);
    }
  }

  if (blockers.length) {
    throw new Error(
      [
        'Refusing to run: this smoke test writes to the database it is pointed at.',
        ...blockers.map((b) => `  • ${b}`),
        '',
        'Point it at a scratch database instead, e.g.',
        '  MONGO_URI=mongodb://127.0.0.1:27017/Animals-super-store-qa \\',
        '  SMOKE_API_URL=http://localhost:5020/api npm run smoke',
        '',
        'Override deliberately with SMOKE_ALLOW_DESTRUCTIVE=true if this target is disposable.',
      ].join('\n')
    );
  }

  console.log('Smoke target');
  console.log(`  API        ${API}`);
  console.log(`  Database   ${database || '(default)'} @ ${host}`);
}

const results = [];
let cookieValue = null;

function check(name, condition, detail = '') {
  results.push({ name, pass: Boolean(condition), detail });
  console.log(`${condition ? '  ✓' : '  ✗ FAIL'}  ${name}${detail && !condition ? ` — ${detail}` : ''}`);
}

/** Minimal cookie jar — single-domain, single-token app. */
function readCookies(response) {
  const setCookies = response.headers.getSetCookie?.() ?? [];
  for (const raw of setCookies) {
    const [pair] = raw.split(';');
    const [name, value] = pair.split('=');
    if (name === 'ass_token') {
      cookieValue = value ? decodeURIComponent(value) : null;
    }
  }
}

async function api(method, path, { body, formData, useCookies = true, rawCookie } = {}) {
  const headers = {};
  if (useCookies && (cookieValue || rawCookie)) {
    headers.Cookie = `ass_token=${rawCookie ?? cookieValue}`;
  }
  if (body) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${API}${path}`, {
    method,
    headers,
    body: formData ?? (body ? JSON.stringify(body) : undefined),
    redirect: 'manual',
  });
  readCookies(response);
  let json = null;
  try {
    json = await response.json();
  } catch {
    /* non-JSON body */
  }
  return { status: response.status, json, response };
}

function section(title) {
  console.log(`\n=== ${title} ===`);
}

async function run() {
  const stamp = Date.now().toString(36);
  const testEmail = `smoke-${stamp}@example.com`;

  section('Health & startup');
  const health = await api('GET', '/health', { useCookies: false });
  check('GET /health returns ok envelope', health.status === 200 && health.json?.data?.status === 'ok');

  section('Authentication');
  const register = await api('POST', '/auth/register', {
    body: { name: 'Smoke Tester', email: testEmail, password: 'Smoke@12345', phone: '9000000000' },
    useCookies: false,
  });
  const setCookieHeader = register.response.headers.getSetCookie?.().find((c) => c.startsWith('ass_token='));
  check('register returns 201 and signs in via httpOnly cookie', register.status === 201 && Boolean(setCookieHeader));
  check('cookie is httpOnly + sameSite=lax', /httponly/i.test(setCookieHeader ?? '') && /samesite=lax/i.test(setCookieHeader ?? ''));
  check('register response never exposes the password', !JSON.stringify(register.json ?? {}).includes('Smoke@12345'));
  check('new user defaults to USER role', register.json?.data?.user?.role === 'USER');

  const me = await api('GET', '/auth/me');
  check('session restores via GET /auth/me', me.status === 200 && me.json?.data?.user?.email === testEmail);

  const badLogin = await api('POST', '/auth/login', { body: { email: testEmail, password: 'Wrong@12345' }, useCookies: false });
  check('wrong password rejected with 401', badLogin.status === 401 && badLogin.json?.success === false);

  const badRegister = await api('POST', '/auth/register', { body: { name: 'x', email: 'not-an-email', password: '123' }, useCookies: false });
  check('invalid registration rejected with 422 field errors', badRegister.status === 422 && Array.isArray(badRegister.json?.errors));

  const tampered = await api('GET', '/auth/me', { rawCookie: `${cookieValue?.slice(0, -3)}abc` });
  check('tampered JWT rejected with 401', tampered.status === 401);

  const logout = await api('POST', '/auth/logout');
  const meAfterLogout = await api('GET', '/auth/me');
  // /auth/me answers 200 with `user: null` for a visitor presenting no cookie
  // (an expected state, not an error). The session being gone is the point.
  check(
    'logout clears the session (no user returned afterwards)',
    logout.status === 200 && meAfterLogout.status === 200 && meAfterLogout.json?.data?.user === null
  );

  // Re-login so the rest of the suite has a valid session.
  await api('POST', '/auth/login', { body: { email: testEmail, password: 'Smoke@12345' }, useCookies: false });
  const profileUpdate = await api('PUT', '/users/me', { body: { name: 'Smoke Tester Renamed' } });
  check('profile update works (PUT /users/me)', profileUpdate.status === 200 && profileUpdate.json?.data?.user?.name === 'Smoke Tester Renamed');

  section('Listings — public search, filters, pagination');
  const list = await api('GET', '/listings?limit=48', { useCookies: false });
  const activeListings = list.json?.data?.listings ?? [];
  check('public search returns only active listings (12 seeded)', list.status === 200 && activeListings.length === 12 && activeListings.every((l) => l.status === 'active'));
  check('response uses the standard envelope', list.json?.success === true && Array.isArray(list.json?.data?.listings) && list.json?.data?.pagination?.totalResults === 12);

  const qSearch = await api('GET', '/listings?q=dog', { useCookies: false });
  check('text search (q) filters by title', qSearch.status === 200 && (qSearch.json?.data?.listings ?? []).every((l) => /dog/i.test(l.title)) && (qSearch.json?.data?.listings ?? []).length > 0);

  const catSearch = await api('GET', '/listings?category=Animals%20Food', { useCookies: false });
  check('category filter works', (catSearch.json?.data?.listings ?? []).length > 0 && (catSearch.json?.data?.listings ?? []).every((l) => l.category === 'Animals Food'));

  const locSearch = await api('GET', '/listings?location=delhi', { useCookies: false });
  check('location filter works (case-insensitive)', (locSearch.json?.data?.listings ?? []).length > 0 && (locSearch.json?.data?.listings ?? []).every((l) => /delhi/i.test(l.location)));

  const priceSearch = await api('GET', '/listings?minPrice=1000&maxPrice=2500', { useCookies: false });
  check('price range filter works', (priceSearch.json?.data?.listings ?? []).every((l) => l.price >= 1000 && l.price <= 2500));

  const sorted = await api('GET', '/listings?sort=price-asc&limit=48', { useCookies: false });
  const prices = (sorted.json?.data?.listings ?? []).map((l) => l.price);
  check('sorting works (price ascending)', prices.length > 1 && prices.every((p, i) => i === 0 || p >= prices[i - 1]));

  const paged = await api('GET', '/listings?limit=5&page=2', { useCookies: false });
  check('pagination works (page 2 of size 5 → 5 items of 12)', paged.json?.data?.listings?.length === 5 && paged.json?.data?.pagination?.page === 2 && paged.json?.data?.pagination?.totalPages === 3);

  section('Listings — visibility rules');
  const anyActive = activeListings[0];
  const detailActive = await api('GET', `/listings/${anyActive.slug}`, { useCookies: false });
  check('active listing detail works', detailActive.status === 200 && detailActive.json?.data?.listing?._id === anyActive._id);
  const ghost = await api('GET', '/listings/this-slug-does-not-exist', { useCookies: false });
  check('unknown slug returns 404', ghost.status === 404);

  section('Admin sessions for cross-cutting tests');
  await api('POST', '/auth/login', { body: { email: 'admin@Animalssuperstore.local', password: 'Admin@12345' }, useCookies: false });
  const adminCookie = cookieValue;
  await api('POST', '/auth/login', { body: { email: 'priya@example.com', password: 'User@12345' }, useCookies: false });
  const priyaCookie = cookieValue;
  await api('POST', '/auth/login', { body: { email: 'rahul@example.com', password: 'User@12345' }, useCookies: false });
  const rahulCookie = cookieValue;
  check('admin, priya, rahul can all log in', Boolean(adminCookie && priyaCookie && rahulCookie));

  const adminListAll = await api('GET', '/admin/listings?limit=48', { rawCookie: adminCookie });
  const allListings = adminListAll.json?.data?.listings ?? [];
  const soldSeeded = allListings.find((l) => l.status === 'sold');
  const archivedSeeded = allListings.find((l) => l.status === 'archived');
  const soldDetail = await api('GET', `/listings/${soldSeeded.slug}`, { useCookies: false });
  check('sold listing stays accessible with clear SOLD state', soldDetail.status === 200 && soldDetail.json?.data?.listing?.status === 'sold');
  const archivedDetail = await api('GET', `/listings/${archivedSeeded.slug}`, { useCookies: false });
  check('archived listing is invisible publicly (404)', archivedDetail.status === 404);

  section('Listings — admin-only management (V1 rule change)');
  // Listing management is ADMIN-only. A normal user is refused on EVERY
  // management endpoint, whether or not they "own" the listing, and the
  // server decides the role from the session — never from the request.
  const priyaMine = await api('GET', '/users/me/listings?status=active&limit=48', { rawCookie: priyaCookie });
  check('normal user cannot reach the listing-management list (403)', priyaMine.status === 403, `got ${priyaMine.status}`);
  const adminMine = await api('GET', '/users/me/listings?status=active&limit=48', { rawCookie: adminCookie });
  check('admin can reach the listing-management list', adminMine.status === 200, `got ${adminMine.status}`);

  // An admin manages ANY listing, so the targets come from the public set.
  const targetProducts = activeListings.filter((l) => l.category !== 'Animalss');
  check('found product listings for the management flows', targetProducts.length >= 3);
  const target = targetProducts[0];

  const userManage = await api('GET', `/listings/${target._id}/manage`, { rawCookie: priyaCookie });
  const userEdit = await api('PUT', `/listings/${target._id}`, { formData: new FormData(), rawCookie: priyaCookie });
  const userSold = await api('PATCH', `/listings/${target._id}/sold`, { rawCookie: priyaCookie });
  const userArchive = await api('PATCH', `/listings/${target._id}/archive`, { rawCookie: priyaCookie });
  const userDelete = await api('DELETE', `/listings/${target._id}`, { rawCookie: priyaCookie });
  check(
    'normal user is forbidden from every listing-management endpoint (403)',
    [userManage, userEdit, userSold, userArchive, userDelete].every((r) => r.status === 403),
    `manage:${userManage.status} edit:${userEdit.status} sold:${userSold.status} archive:${userArchive.status} delete:${userDelete.status}`
  );

  const unauthManage = await api('GET', `/listings/${target._id}/manage`, { useCookies: false });
  const unauthEdit = await api('PUT', `/listings/${target._id}`, { formData: new FormData(), useCookies: false });
  const unauthDelete = await api('DELETE', `/listings/${target._id}`, { useCookies: false });
  check(
    'unauthenticated listing management rejected (401)',
    unauthManage.status === 401 && unauthEdit.status === 401 && unauthDelete.status === 401,
    `manage:${unauthManage.status} edit:${unauthEdit.status} delete:${unauthDelete.status}`
  );

  section('Listings — admin management (edit, sold, archive, delete)');
  const manageCopy = await api('GET', `/listings/${target._id}/manage`, { rawCookie: adminCookie });
  const originalSlug = manageCopy.json?.data?.listing?.slug;
  check('admin can load any listing for management', manageCopy.status === 200 && Boolean(originalSlug), `got ${manageCopy.status}`);

  const updateForm = new FormData();
  updateForm.append('title', 'Premium Dog Food 20kg Bag — Fresh Stock');
  updateForm.append('category', manageCopy.json.data.listing.category);
  updateForm.append('description', manageCopy.json.data.listing.description);
  updateForm.append('price', String(manageCopy.json.data.listing.price));
  updateForm.append('location', manageCopy.json.data.listing.location);
  updateForm.append('sellerName', manageCopy.json.data.listing.sellerName);
  updateForm.append('contactNumber', manageCopy.json.data.listing.contactNumber);
  updateForm.append('contactEmail', manageCopy.json.data.listing.contactEmail);
  updateForm.append('additionalDetails', '');
  updateForm.append('existingImages', JSON.stringify(manageCopy.json.data.listing.images));
  const updated = await api('PUT', `/listings/${target._id}`, { formData: updateForm, rawCookie: adminCookie });
  check('admin can edit (keeping existing images, no new upload needed)', updated.status === 200 && updated.json?.data?.listing?.title?.includes('Fresh Stock'));
  check('slug stays stable across title edits', updated.json?.data?.listing?.slug === originalSlug);

  const markSold = await api('PATCH', `/listings/${target._id}/sold`, { rawCookie: adminCookie });
  check('admin can mark as sold', markSold.status === 200 && markSold.json?.data?.listing?.status === 'sold');
  const soldAgain = await api('PATCH', `/listings/${target._id}/sold`, { rawCookie: adminCookie });
  check('marking sold twice is a safe no-op', soldAgain.status === 200);

  const archiveTarget = targetProducts[1];
  const archived = await api('PATCH', `/listings/${archiveTarget._id}/archive`, { rawCookie: adminCookie });
  const archivedPublic = await api('GET', `/listings/${archived.json?.data?.listing?.slug}`, { useCookies: false });
  check('admin archive works and hides the listing publicly', archived.status === 200 && archived.json?.data?.listing?.status === 'archived' && archivedPublic.status === 404);

  const deleteTarget = targetProducts[2];
  const deleted = await api('DELETE', `/listings/${deleteTarget._id}`, { rawCookie: adminCookie });
  const deletedGone = await api('GET', `/listings/${deleteTarget.slug}`, { useCookies: false });
  check('admin delete works and cleans up Cloudinary best-effort', deleted.status === 200 && deletedGone.status === 404);

  section('Listings — creation is ADMIN-only (V1 rule change)');
  const noImages = new FormData();
  noImages.append('title', 'Test Listing Without Images');
  noImages.append('category', 'Other');
  noImages.append('description', 'This listing has no images and should be rejected.');
  noImages.append('price', '100');
  noImages.append('location', 'Mumbai');
  noImages.append('sellerName', 'Smoke Tester');
  noImages.append('contactNumber', '9000000000');

  // The role gate runs BEFORE validation and before any upload work, so the
  // same malformed body is refused with 403 for a user and 401 for a guest.
  const unauthCreate = await api('POST', '/listings', { formData: noImages, useCookies: false });
  check('unauthenticated listing creation rejected (401)', unauthCreate.status === 401, `got ${unauthCreate.status}`);
  const userCreate = await api('POST', '/listings', { formData: noImages, rawCookie: priyaCookie });
  check('normal user listing creation forbidden (403) — not a validation error', userCreate.status === 403, `got ${userCreate.status}: ${userCreate.json?.message ?? ''}`);
  const rahulCreate = await api('POST', '/listings', { formData: noImages, rawCookie: rahulCookie });
  check('every non-admin role is refused (403)', rahulCreate.status === 403, `got ${rahulCreate.status}`);
  const forgedRole = new FormData();
  forgedRole.append('role', 'ADMIN');
  forgedRole.append('isAdmin', 'true');
  for (const [key, value] of noImages.entries()) forgedRole.append(key, value);
  const forgedCreate = await api('POST', '/listings', { formData: forgedRole, rawCookie: priyaCookie });
  check('a frontend-supplied role in the body is ignored (still 403)', forgedCreate.status === 403, `got ${forgedCreate.status}`);

  const createNoImages = await api('POST', '/listings', { formData: noImages, rawCookie: adminCookie });
  check('admin reaching the create endpoint gets normal validation (422 without images)', createNoImages.status === 422, `got ${createNoImages.status}`);

  const badCategory = new FormData();
  badCategory.append('title', 'Test Listing With Bad Category');
  badCategory.append('category', 'Live Animalss'); // must never be a valid category
  badCategory.append('description', 'This listing uses an invalid category and should be rejected.');
  badCategory.append('price', '100');
  badCategory.append('location', 'Mumbai');
  badCategory.append('sellerName', 'Smoke Tester');
  badCategory.append('contactNumber', '9000000000');
  const createBadCategory = await api('POST', '/listings', { formData: badCategory, rawCookie: adminCookie });
  check(
    'invalid category rejected (422) — the 5 fixed categories are enforced',
    createBadCategory.status === 422 && JSON.stringify(createBadCategory.json?.errors ?? '').includes('Animals Food'),
    JSON.stringify(createBadCategory.json?.errors ?? createBadCategory.json)
  );

  const pngBytes = Buffer.from(
    '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c626001000000ffff03000006000557bfabd40000000049454e44ae426082',
    'hex'
  );
  const withImage = new FormData();
  withImage.append('title', 'Smoke Test Listing With Image');
  withImage.append('category', 'Other');
  withImage.append('description', 'A listing created by the smoke test with one tiny image.');
  withImage.append('price', '250');
  withImage.append('location', 'Mumbai');
  withImage.append('sellerName', 'Smoke Tester');
  withImage.append('contactNumber', '9000000000');
  withImage.append('images', new Blob([pngBytes], { type: 'image/png' }), 'test.png');
  const createWithImage = await api('POST', '/listings', { formData: withImage, rawCookie: adminCookie });
  if (createWithImage.status === 201) {
    const created = createWithImage.json?.data?.listing;
    check('admin-created listing is created and PUBLIC IMMEDIATELY (active, no approval)', created?.status === 'active');
    const publicCheck = await api('GET', `/listings/${created.slug}`, { useCookies: false });
    check('new listing is instantly visible publicly', publicCheck.status === 200);
    await api('DELETE', `/listings/${created._id}`, { rawCookie: adminCookie });
  } else {
    check(
      'image upload returns the clear 503 when Cloudinary is unconfigured',
      createWithImage.status === 503 && /not set up/i.test(createWithImage.json?.message ?? ''),
      `got ${createWithImage.status}: ${createWithImage.json?.message}`
    );
  }

  section('Listings — Animalss (V1 scope change)');
  // The sealed Animals listing from the seed: public, filterable, and readable.
  const AnimalsList = await api('GET', '/listings?category=Animalss&limit=48', { useCookies: false });
  const Animalss = AnimalsList.json?.data?.listings ?? [];
  check('Animalss category is a real, filterable category', AnimalsList.status === 200 && Animalss.length === 4 && Animalss.every((l) => l.category === 'Animalss'));
  const seedAnimals = Animalss[0];
  check(
    'Animals listings expose type, breed, age (months), and gender',
    Boolean(seedAnimals?.AnimalsType && seedAnimals?.breed && Number.isInteger(seedAnimals?.ageMonths) && seedAnimals?.gender),
    JSON.stringify({ AnimalsType: seedAnimals?.AnimalsType, breed: seedAnimals?.breed, ageMonths: seedAnimals?.ageMonths, gender: seedAnimals?.gender })
  );

  const AnimalsDetail = await api('GET', `/listings/${seedAnimals?.slug}`, { useCookies: false });
  check('Animals listing detail page data is public', AnimalsDetail.status === 200 && AnimalsDetail.json?.data?.listing?.AnimalsType === seedAnimals?.AnimalsType);

  const byType = await api('GET', '/listings?category=Animalss&AnimalsType=Dog&limit=48', { useCookies: false });
  check('Animals type filter works', (byType.json?.data?.listings ?? []).length > 0 && (byType.json?.data?.listings ?? []).every((l) => l.AnimalsType === 'Dog'));

  const byGender = await api('GET', '/listings?category=Animalss&gender=Male&limit=48', { useCookies: false });
  check('Animals gender filter works', (byGender.json?.data?.listings ?? []).length > 0 && (byGender.json?.data?.listings ?? []).every((l) => l.gender === 'Male'));

  const byBreed = await api('GET', '/listings?category=Animalss&breed=sahiwal&limit=48', { useCookies: false });
  check('breed filter works (case-insensitive)', (byBreed.json?.data?.listings ?? []).length > 0 && (byBreed.json?.data?.listings ?? []).every((l) => /sahiwal/i.test(l.breed)));

  const byAge = await api('GET', '/listings?category=Animalss&minAgeMonths=30&maxAgeMonths=60&limit=48', { useCookies: false });
  const agedAnimalss = byAge.json?.data?.listings ?? [];
  check('age range filter works', agedAnimalss.length > 0 && agedAnimalss.every((l) => l.ageMonths >= 30 && l.ageMonths <= 60));

  // Product searches must be untouched by the Animals filters. Earlier sections
  // have already sold/archived/deleted some products, so pick a live one
  // rather than assuming a specific category still has stock.
  const everyActive = await api('GET', '/listings?limit=48', { useCookies: false });
  const activeNow = everyActive.json?.data?.listings ?? [];
  const liveProduct = activeNow.find((l) => l.category !== 'Animalss');
  const stillProducts = await api('GET', `/listings?category=${encodeURIComponent(liveProduct?.category ?? '')}&limit=48`, { useCookies: false });
  const productResults = stillProducts.json?.data?.listings ?? [];
  check(
    'product listings still search normally by category',
    Boolean(liveProduct) &&
      stillProducts.status === 200 &&
      productResults.length > 0 &&
      productResults.every((l) => l.category === liveProduct.category),
    `category=${liveProduct?.category} got ${productResults.length}`
  );
  const nonAnimalsListings = activeNow.filter((l) => l.category !== 'Animalss');
  check(
    'no product listing carries Animals fields',
    nonAnimalsListings.length > 0 &&
      nonAnimalsListings.every((l) => !l.AnimalsType && !l.breed && l.ageMonths === undefined && !l.gender),
    JSON.stringify(nonAnimalsListings.filter((l) => l.AnimalsType).map((l) => l.title))
  );

  // Reporting and moderation must keep working for Animals listings too.
  const AnimalsReport = await api('POST', '/reports', {
    body: { listing: seedAnimals?._id, reason: 'Other', description: 'Smoke test Animals report' },
    rawCookie: rahulCookie,
  });
  check('Animals listings can be reported like any other listing', AnimalsReport.status === 201, `got ${AnimalsReport.status}`);
  const AnimalsReported = await api('GET', '/admin/reports?limit=48', { rawCookie: adminCookie });
  check(
    'the Animals report reaches the admin report queue',
    (AnimalsReported.json?.data?.reports ?? []).some((r) => r.description === 'Smoke test Animals report')
  );

  // Animals-specific fields are required for the Animalss category...
  const AnimalsNoDetails = new FormData();
  AnimalsNoDetails.append('title', 'Animals Listing Missing Its Details');
  AnimalsNoDetails.append('category', 'Animalss');
  AnimalsNoDetails.append('description', 'An Animals listing that omits every Animals-specific field.');
  AnimalsNoDetails.append('price', '5000');
  AnimalsNoDetails.append('location', 'Mumbai');
  AnimalsNoDetails.append('sellerName', 'Priya Sharma');
  AnimalsNoDetails.append('contactNumber', '9876543210');
  const createNoAnimalsDetails = await api('POST', '/listings', { formData: AnimalsNoDetails, rawCookie: adminCookie });
  const AnimalsDetailErrors = JSON.stringify(createNoAnimalsDetails.json?.errors ?? '');
  check(
    'Animals listing without Animals fields rejected (422)',
    createNoAnimalsDetails.status === 422 &&
      ['AnimalsType', 'breed', 'ageMonths', 'gender'].every((field) => AnimalsDetailErrors.includes(field)),
    AnimalsDetailErrors
  );

  // ...and rejected when the Animals values themselves are invalid.
  const AnimalsBadValues = new FormData();
  AnimalsBadValues.append('title', 'Animals Listing With Invalid Details');
  AnimalsBadValues.append('category', 'Animalss');
  AnimalsBadValues.append('description', 'An Animals listing whose Animals fields are out of range.');
  AnimalsBadValues.append('price', '5000');
  AnimalsBadValues.append('location', 'Mumbai');
  AnimalsBadValues.append('sellerName', 'Priya Sharma');
  AnimalsBadValues.append('contactNumber', '9876543210');
  AnimalsBadValues.append('AnimalsType', 'Dragon'); // not in the enum
  AnimalsBadValues.append('breed', 'Test Breed');
  AnimalsBadValues.append('ageMonths', '99999'); // beyond MAX_AGE_MONTHS
  AnimalsBadValues.append('gender', 'Male');
  const createBadAnimals = await api('POST', '/listings', { formData: AnimalsBadValues, rawCookie: adminCookie });
  check('invalid Animals type and age rejected (422)', createBadAnimals.status === 422, `got ${createBadAnimals.status}`);

  // A full Animals listing with an image — same Cloudinary caveat as products.
  const AnimalsWithImage = new FormData();
  AnimalsWithImage.append('title', 'Smoke Test Animals Listing');
  AnimalsWithImage.append('category', 'Animalss');
  AnimalsWithImage.append('description', 'An Animals listing created by the smoke test with one tiny image.');
  AnimalsWithImage.append('price', '9000');
  AnimalsWithImage.append('location', 'Mumbai');
  AnimalsWithImage.append('sellerName', 'Priya Sharma');
  AnimalsWithImage.append('contactNumber', '9876543210');
  AnimalsWithImage.append('AnimalsType', 'Rabbit');
  AnimalsWithImage.append('breed', 'Mini Rex');
  AnimalsWithImage.append('ageMonths', '7');
  AnimalsWithImage.append('gender', 'Female');
  AnimalsWithImage.append('images', new Blob([pngBytes], { type: 'image/png' }), 'test.png');
  const createAnimals = await api('POST', '/listings', { formData: AnimalsWithImage, rawCookie: adminCookie });
  if (createAnimals.status === 201) {
    const created = createAnimals.json?.data?.listing;
    check(
      'admin-created Animals listing is active and public immediately (no approval)',
      created?.status === 'active' && created?.AnimalsType === 'Rabbit' && created?.ageMonths === 7,
      JSON.stringify({ status: created?.status, AnimalsType: created?.AnimalsType, ageMonths: created?.ageMonths })
    );
    const AnimalsPublic = await api('GET', `/listings/${created.slug}`, { useCookies: false });
    check('new Animals listing is instantly visible publicly', AnimalsPublic.status === 200);

    // Admin edit: change the age and confirm the Animals fields round-trip.
    const AnimalsEdit = new FormData();
    AnimalsEdit.append('title', 'Smoke Test Animals Listing — Updated');
    AnimalsEdit.append('category', 'Animalss');
    AnimalsEdit.append('description', 'An Animals listing created by the smoke test with one tiny image.');
    AnimalsEdit.append('price', '9000');
    AnimalsEdit.append('location', 'Mumbai');
    AnimalsEdit.append('sellerName', 'Priya Sharma');
    AnimalsEdit.append('contactNumber', '9876543210');
    AnimalsEdit.append('AnimalsType', 'Rabbit');
    AnimalsEdit.append('breed', 'Mini Rex');
    AnimalsEdit.append('ageMonths', '14');
    AnimalsEdit.append('gender', 'Female');
    AnimalsEdit.append('existingImages', JSON.stringify(created.images));
    const editedAnimals = await api('PUT', `/listings/${created._id}`, { formData: AnimalsEdit, rawCookie: adminCookie });
    check(
      'admin can edit an Animals listing (age updated, fields kept)',
      editedAnimals.status === 200 && editedAnimals.json?.data?.listing?.ageMonths === 14 && editedAnimals.json?.data?.listing?.breed === 'Mini Rex',
      `got ${editedAnimals.status}`
    );

    // A normal user must not be able to touch it — same 403 as any listing.
    const foreignAnimalsEdit = new FormData();
    foreignAnimalsEdit.append('title', 'Hijacked Animals Listing');
    const foreignAnimalsPut = await api('PUT', `/listings/${created._id}`, { formData: foreignAnimalsEdit, rawCookie: rahulCookie });
    check('normal user cannot edit an Animals listing (403)', foreignAnimalsPut.status === 403);

    const AnimalsAdminList = await api('GET', '/admin/listings?category=Animalss&AnimalsType=Rabbit&limit=48', { rawCookie: adminCookie });
    const adminAnimals = (AnimalsAdminList.json?.data?.listings ?? []).find((l) => l._id === created._id);
    check('admin can find an Animals listing by category + Animals type', Boolean(adminAnimals));

    const AnimalsSold = await api('PATCH', `/listings/${created._id}/sold`, { rawCookie: adminCookie });
    check('admin can mark an Animals listing sold', AnimalsSold.status === 200 && AnimalsSold.json?.data?.listing?.status === 'sold');

    const AnimalsArchived = await api('PATCH', `/listings/${created._id}/archive`, { rawCookie: adminCookie });
    const AnimalsArchivedPublic = await api('GET', `/listings/${created.slug}`, { useCookies: false });
    check(
      'archived Animals listing drops out of public search (404 on detail)',
      AnimalsArchived.status === 200 && AnimalsArchivedPublic.status === 404
    );
    const AnimalssAfterArchive = await api('GET', `/listings?q=${encodeURIComponent('Smoke Test Animals')}&limit=48`, { useCookies: false });
    check(
      'archived Animals listing is excluded from public search results',
      (AnimalssAfterArchive.json?.data?.listings ?? []).length === 0
    );

    await api('DELETE', `/listings/${created._id}`, { rawCookie: adminCookie });
  } else {
    check(
      'Animals image upload returns the clear 503 when Cloudinary is unconfigured',
      createAnimals.status === 503 && /not set up/i.test(createAnimals.json?.message ?? ''),
      `got ${createAnimals.status}: ${createAnimals.json?.message}`
    );
  }

  section('Blog — public');
  const blogs = await api('GET', '/blogs?limit=24', { useCookies: false });
  check('public blog list shows only published (3 seeded)', blogs.status === 200 && blogs.json?.data?.blogs?.length === 3 && blogs.json?.data?.blogs?.every((b) => b.status === 'published'));

  const blogSlug = blogs.json?.data?.blogs?.[0]?.slug;
  const blogDetail = await api('GET', `/blogs/${blogSlug}`, { useCookies: false });
  check('published blog detail works', blogDetail.status === 200 && blogDetail.json?.data?.blog?.slug === blogSlug);

  const adminBlogs = await api('GET', '/admin/blogs?limit=48', { rawCookie: adminCookie });
  const draftBlog = (adminBlogs.json?.data?.blogs ?? []).find((b) => b.status === 'draft');
  const archivedBlog = (adminBlogs.json?.data?.blogs ?? []).find((b) => b.status === 'archived');
  const draftPublic = await api('GET', `/blogs/${draftBlog?.slug}`, { useCookies: false });
  const archivedBlogPublic = await api('GET', `/blogs/${archivedBlog?.slug}`, { useCookies: false });
  check('drafts are not publicly visible (404)', draftPublic.status === 404);
  check('archived blogs are not publicly visible (404)', archivedBlogPublic.status === 404);

  section('Blog — admin CRUD, lifecycle, sanitization');
  const priyaBlogs = await api('GET', '/admin/blogs', { rawCookie: priyaCookie });
  check('non-admin cannot manage blogs (403)', priyaBlogs.status === 403);

  const xssContent = '<p>Safe paragraph</p><script>alert(1)</script><img src="x" onerror="alert(2)"><a href="javascript:alert(3)">link</a><strong>bold</strong>';
  const blogForm = new FormData();
  blogForm.append('title', 'Smoke Test Blog Article');
  blogForm.append('excerpt', 'A temporary article created by the final smoke test run.');
  blogForm.append('content', xssContent);
  blogForm.append('category', 'Testing');
  blogForm.append('tags', 'smoke,test');
  blogForm.append('status', 'draft');
  const createdBlog = await api('POST', '/admin/blogs', { formData: blogForm, rawCookie: adminCookie });
  const createdBlogDoc = createdBlog.json?.data?.blog;
  check('admin can create a draft blog (no cover needed)', createdBlog.status === 201 && createdBlogDoc?.status === 'draft' && createdBlogDoc?.publishedAt === null);
  check(
    'rich text is sanitized on save (script/onerror/javascript: stripped)',
    createdBlogDoc?.content?.includes('Safe paragraph') &&
      createdBlogDoc?.content?.includes('bold') &&
      !createdBlogDoc?.content?.includes('<script') &&
      !createdBlogDoc?.content?.includes('onerror') &&
      !createdBlogDoc?.content?.includes('javascript:')
  );

  const publishBlog = await api('PATCH', `/admin/blogs/${createdBlogDoc._id}/publish`, { rawCookie: adminCookie });
  check('publish works and sets publishedAt', publishBlog.status === 200 && publishBlog.json?.data?.blog?.status === 'published' && Boolean(publishBlog.json?.data?.blog?.publishedAt));
  const publishedPublic = await api('GET', `/blogs/${createdBlogDoc.slug}`, { useCookies: false });
  check('published blog is instantly public', publishedPublic.status === 200);

  const blogEditForm = new FormData();
  blogEditForm.append('title', 'Smoke Test Blog Article — Renamed');
  blogEditForm.append('excerpt', 'A temporary article created by the final smoke test run.');
  blogEditForm.append('content', '<p>Updated content.</p>');
  blogEditForm.append('category', 'Testing');
  blogEditForm.append('tags', 'smoke,test');
  const updatedBlog = await api('PUT', `/admin/blogs/${createdBlogDoc._id}`, { formData: blogEditForm, rawCookie: adminCookie });
  check('admin can update a blog; slug stays stable', updatedBlog.status === 200 && updatedBlog.json?.data?.blog?.title?.includes('Renamed') && updatedBlog.json?.data?.blog?.slug === createdBlogDoc.slug);

  const unpublish = await api('PATCH', `/admin/blogs/${createdBlogDoc._id}/unpublish`, { rawCookie: adminCookie });
  const unpublishPublic = await api('GET', `/blogs/${createdBlogDoc.slug}`, { useCookies: false });
  check('unpublish moves the blog back to drafts and hides it', unpublish.status === 200 && unpublish.json?.data?.blog?.status === 'draft' && unpublishPublic.status === 404);

  await api('PATCH', `/admin/blogs/${createdBlogDoc._id}/archive`, { rawCookie: adminCookie });
  const deleteBlog = await api('DELETE', `/admin/blogs/${createdBlogDoc._id}`, { rawCookie: adminCookie });
  const blogsAfter = await api('GET', '/blogs?limit=24', { useCookies: false });
  check('archive + delete work; public list back to 3', deleteBlog.status === 200 && blogsAfter.json?.data?.blogs?.length === 3);

  section('Reports');
  // Reporting is unchanged: any signed-in user can report any public listing.
  // The target is picked from the PUBLIC list — a normal user can no longer
  // read `/users/me/listings`, and doesn't need to.
  const reportable = await api('GET', '/listings?limit=48', { useCookies: false });
  const existingReports = await api('GET', '/admin/reports?limit=48', { rawCookie: adminCookie });
  const priyaReportedIds = new Set(
    (existingReports.json?.data?.reports ?? [])
      .filter((r) => r.reporter?.email === 'priya@example.com' && r.status !== 'dismissed')
      .map((r) => r.listing?._id?.toString())
  );
  const reportTarget = (reportable.json?.data?.listings ?? []).find((l) => !priyaReportedIds.has(l._id.toString()));
  check('found an unreported public listing to target', Boolean(reportTarget), `listings call: ${reportable.status}`);
  const report = await api('POST', '/reports', { body: { listing: reportTarget?._id, reason: 'Spam', description: 'Smoke test report' }, rawCookie: priyaCookie });
  check('authenticated user can report a listing', report.status === 201 && report.json?.data?.report?.status === 'open', `got ${report.status}: ${report.json?.message ?? ''}`);
  const dupReport = await api('POST', '/reports', { body: { listing: reportTarget?._id, reason: 'Spam' }, rawCookie: priyaCookie });
  check('duplicate active report rejected (409)', dupReport.status === 409);
  const badReason = await api('POST', '/reports', { body: { listing: reportTarget?._id, reason: 'Nonsense' }, rawCookie: priyaCookie });
  check('invalid reason rejected (422)', badReason.status === 422);
  const unauthReport = await api('POST', '/reports', { body: { listing: reportTarget?._id, reason: 'Spam' }, useCookies: false });
  check('unauthenticated report rejected (401)', unauthReport.status === 401);

  const priyaReports = await api('GET', '/admin/reports', { rawCookie: priyaCookie });
  check('non-admin cannot list reports (403)', priyaReports.status === 403);
  const adminReports = await api('GET', '/admin/reports?status=open&limit=48', { rawCookie: adminCookie });
  const myReport = (adminReports.json?.data?.reports ?? []).find((r) => r.description === 'Smoke test report');
  check('admin can list and filter reports', Boolean(myReport));
  const statusUpdate = await api('PATCH', `/admin/reports/${myReport?._id}/status`, { body: { status: 'reviewed' }, rawCookie: adminCookie });
  check('admin can update report status', statusUpdate.status === 200 && statusUpdate.json?.data?.report?.status === 'reviewed');

  section('Admin — dashboard, users, moderation');
  const priyaStats = await api('GET', '/admin/stats', { rawCookie: priyaCookie });
  const unauthStats = await api('GET', '/admin/stats', { useCookies: false });
  check('admin stats blocked for users (403) and guests (401)', priyaStats.status === 403 && unauthStats.status === 401);

  const stats = await api('GET', '/admin/stats', { rawCookie: adminCookie });
  const statsData = stats.json?.data?.stats;
  const adminUsers = await api('GET', '/admin/users?limit=48', { rawCookie: adminCookie });
  const adminAllBlogs = await api('GET', '/admin/blogs?limit=48', { rawCookie: adminCookie });
  const adminAllReports = await api('GET', '/admin/reports?limit=48', { rawCookie: adminCookie });
  const adminAllListings = await api('GET', '/admin/listings?limit=48', { rawCookie: adminCookie });
  const counts = {
    users: adminUsers.json?.data?.pagination?.totalResults,
    listings: adminAllListings.json?.data?.pagination?.totalResults,
    blogs: adminAllBlogs.json?.data?.pagination?.totalResults,
    reports: adminAllReports.json?.data?.pagination?.totalResults,
  };
  const statsTotals = {
    users: statsData?.users?.total,
    listings: statsData?.listings?.total,
    blogs: statsData?.blogs?.total,
    reports: statsData?.reports?.total,
  };
  // Cross-endpoint consistency rather than baked-in seed counts: the suite
  // mutates listings/blogs/reports on the way here, so a literal number would
  // only re-assert the seed file.
  check(
    'dashboard stats match the admin list totals',
    stats.status === 200 && JSON.stringify(statsTotals) === JSON.stringify(counts),
    `stats ${JSON.stringify(statsTotals)} vs lists ${JSON.stringify(counts)}`
  );
  check(
    'listing status buckets add up to the listing total',
    statsData?.listings?.active + statsData?.listings?.sold + statsData?.listings?.archived === statsData?.listings?.total,
    JSON.stringify(statsData?.listings)
  );
  check('stats include recent listings and reports', statsData?.recentListings?.length > 0 && statsData?.recentReports?.length > 0);

  const userSearch = await api('GET', '/admin/users?q=smoke', { rawCookie: adminCookie });
  const smokeUser = (userSearch.json?.data?.users ?? [])[0];
  check('admin can search users', Boolean(smokeUser?.id));
  // Switch the active session back to the smoke user before blocking them,
  // so the lockout checks hit the blocked account (not the last-logged-in user).
  const reloginBlocked = await api('POST', '/auth/login', { body: { email: testEmail, password: 'Smoke@12345' }, useCookies: false });
  check('smoke user session re-established before block test', reloginBlocked.status === 200);
  const block = await api('PATCH', `/admin/users/${smokeUser.id}/block`, { rawCookie: adminCookie });
  check('admin can block a user', block.status === 200 && block.json?.data?.user?.status === 'blocked');
  // The smoke user's session is the current cookieValue — verify the lockout.
  // `PUT /users/me` is an endpoint a normal user CAN use, so a 403 here proves
  // the block rather than the admin-only listing rule.
  const blockedMe = await api('GET', '/auth/me');
  const blockedProfile = await api('PUT', '/users/me', { body: { name: 'Should Not Apply' } });
  check('blocked user is locked out instantly (403 everywhere)', blockedMe.status === 403 && blockedProfile.status === 403, `me:${blockedMe.status} profile:${blockedProfile.status}`);
  const unblock = await api('PATCH', `/admin/users/${smokeUser.id}/unblock`, { rawCookie: adminCookie });
  const unblockedMe = await api('GET', '/auth/me');
  check('unblock restores access', unblock.status === 200 && unblockedMe.status === 200, `me:${unblockedMe.status}`);

  const adminMe = await api('GET', '/auth/me', { rawCookie: adminCookie });
  const selfBlock = await api('PATCH', `/admin/users/${adminMe.json?.data?.user?.id}/block`, { rawCookie: adminCookie });
  check('admin cannot block their own account (400)', selfBlock.status === 400);

  const modList = await api('GET', '/admin/listings?status=active&limit=48', { rawCookie: adminCookie });
  const modTarget = (modList.json?.data?.listings ?? [])[0];
  const modArchive = await api('PATCH', `/admin/listings/${modTarget._id}/archive`, { rawCookie: adminCookie });
  const modDelete = await api('DELETE', `/admin/listings/${modTarget._id}`, { rawCookie: adminCookie });
  check('admin can archive and delete listings', modArchive.status === 200 && modDelete.status === 200);

  const approve = await api('PATCH', `/admin/listings/${modTarget._id}/approve`, { rawCookie: adminCookie });
  const reject = await api('POST', `/admin/listings/${modTarget._id}/reject`, { rawCookie: adminCookie });
  check('NO approval endpoints exist (404) — no approval workflow', approve.status === 404 && reject.status === 404);

  section('Security — injection, headers, hashing');
  const injection = await api('GET', '/listings?category[$ne]=x', { useCookies: false });
  check('mongo injection via query operators is rejected', injection.status === 422, `got ${injection.status}`);

  const rateHeaders = await api('GET', '/health', { useCookies: false });
  check(
    'rate limiting is active (RateLimit headers present)',
    Boolean(rateHeaders.response.headers.get('ratelimit-policy') ?? rateHeaders.response.headers.get('ratelimit'))
  );

  const csp = rateHeaders.response.headers.get('content-security-policy');
  const nosniff = rateHeaders.response.headers.get('x-content-type-options');
  const frame = rateHeaders.response.headers.get('x-frame-options');
  check('security headers present (CSP, nosniff, frame-options)', Boolean(csp && nosniff && frame));

  // Direct DB checks (the script runs in the server workspace).
  await mongoose.connect(env.mongoUri);
  const userDoc = await mongoose.connection.collection('users').findOne({ email: 'priya@example.com' });
  check('passwords are bcrypt-hashed in the database', /^\$2[aby]\$/.test(userDoc?.password ?? ''), userDoc?.password?.slice(0, 7));
  const noEnvSecrets = !JSON.stringify(userDoc ?? {}).includes(env.jwtSecret);
  check('no secrets leak into user documents', noEnvSecrets);

  // =========================================================================
  // PHASE 3 — CONTACT INQUIRY MANAGEMENT
  // =========================================================================
  section('Contact Inquiries (Phase 3)');

  const validInquiry = {
    name: 'Rohit Sharma',
    email: 'rohit@example.com',
    phone: '+91 98765 43210',
    subject: 'Bulk feed inquiry',
    message: 'We require 50 bags of premium dog food for our shelter. Please send quotation.',
  };
  const createInq = await api('POST', '/inquiries', { body: validInquiry, useCookies: false });
  check('public inquiry submission succeeds with valid data', createInq.status === 201 && createInq.json?.data?.inquiry?.name === validInquiry.name);

  const inquiryId = createInq.json?.data?.inquiry?._id;

  const invalidInq = await api('POST', '/inquiries', {
    body: { name: 'R', email: 'not-an-email', subject: '', message: 'Hi' },
    useCookies: false,
  });
  check('invalid inquiry data is rejected (422)', invalidInq.status === 422 && invalidInq.json?.errors?.length > 0);

  const inqDoc = await mongoose.connection.collection('inquiries').findOne({ _id: new mongoose.Types.ObjectId(inquiryId) });
  check('inquiry is stored in MongoDB', Boolean(inqDoc));
  check('default status is "new"', inqDoc?.status === 'new');

  const statusTamper = await api('POST', '/inquiries', {
    body: { ...validInquiry, email: 'tamper@example.com', status: 'resolved' },
    useCookies: false,
  });
  check('client cannot set status on public submission', statusTamper.status === 201 && statusTamper.json?.data?.inquiry?.status === 'new');

  const userInquiries = await api('GET', '/inquiries', { rawCookie: priyaCookie });
  check('normal user cannot access admin inquiry endpoints (403)', userInquiries.status === 403);

  const guestInquiries = await api('GET', '/inquiries', { useCookies: false });
  check('guest cannot access admin inquiry endpoints (401)', guestInquiries.status === 401);

  const adminInqList = await api('GET', '/inquiries', { rawCookie: adminCookie });
  check('admin can list inquiries', adminInqList.status === 200 && Array.isArray(adminInqList.json?.data?.inquiries));

  const adminGetInq = await api('GET', `/inquiries/${inquiryId}`, { rawCookie: adminCookie });
  check('admin can view inquiry by id', adminGetInq.status === 200 && adminGetInq.json?.data?.inquiry?.subject === validInquiry.subject);

  const updateStatus = await api('PATCH', `/inquiries/${inquiryId}/status`, {
    body: { status: 'read' },
    rawCookie: adminCookie,
  });
  check('admin can update inquiry status', updateStatus.status === 200 && updateStatus.json?.data?.inquiry?.status === 'read');

  const searchInq = await api('GET', '/inquiries?q=Rohit', { rawCookie: adminCookie });
  check('inquiry search by keyword works', (searchInq.json?.data?.inquiries ?? []).length > 0);

  const filterInq = await api('GET', '/inquiries?status=read', { rawCookie: adminCookie });
  check('inquiry filter by status works', (filterInq.json?.data?.inquiries ?? []).every((i) => i.status === 'read'));

  const deleteInq = await api('DELETE', `/inquiries/${inquiryId}`, { rawCookie: adminCookie });
  check('admin can delete inquiry', deleteInq.status === 200);

  // =========================================================================
  // PHASE 3 — PRODUCT INVENTORY MANAGEMENT
  // =========================================================================
  section('Product Inventory Management (Phase 3)');

  const allListingsRes = await api('GET', '/listings?limit=48', { useCookies: false });
  const activeProducts = (allListingsRes.json?.data?.listings ?? []).filter((l) => l.category !== 'Animalss' && l.status === 'active');
  const targetProduct = activeProducts[0];
  check('found active product for inventory testing', Boolean(targetProduct));

  check('existing purchasable product exposes non-negative stockQuantity', typeof targetProduct?.stockQuantity === 'number' && targetProduct?.stockQuantity >= 0);

  await mongoose.connection.collection('listings').updateOne(
    { _id: new mongoose.Types.ObjectId(targetProduct._id) },
    { $set: { stockQuantity: 10 } }
  );
  const recheckListing = await api('GET', `/listings/${targetProduct.slug}`, { useCookies: false });
  check('product stock set to 10 successfully', recheckListing.json?.data?.listing?.stockQuantity === 10);

  const orderPayload = {
    customer: {
      name: 'Inventory Test Customer',
      email: 'customer@example.com',
      phone: '9876543210',
    },
    shippingAddress: {
      street: '123 Test St',
      city: 'Mumbai',
      postalCode: '400001',
      country: 'India',
    },
    items: [
      {
        listingId: targetProduct._id,
        quantity: 3,
      },
    ],
    paymentMethod: 'cod',
  };
  const orderRes = await api('POST', '/orders', { body: orderPayload, useCookies: false });
  check('successful order with sufficient stock returns 201', orderRes.status === 201);
  const createdOrderId = orderRes.json?.data?.order?._id;

  const afterOrderListing = await api('GET', `/listings/${targetProduct.slug}`, { useCookies: false });
  check('successful order decrements stock correctly (10 -> 7)', afterOrderListing.json?.data?.listing?.stockQuantity === 7);

  const excessOrder = await api('POST', '/orders', {
    body: {
      ...orderPayload,
      items: [{ listingId: targetProduct._id, quantity: 8 }],
    },
    useCookies: false,
  });
  check('backend rejects order exceeding available stock (400)', excessOrder.status === 400 && /insufficient stock/i.test(excessOrder.json?.message ?? ''));

  const afterExcessListing = await api('GET', `/listings/${targetProduct.slug}`, { useCookies: false });
  check('stock is untouched after rejected order (still 7)', afterExcessListing.json?.data?.listing?.stockQuantity === 7);

  const confirmOrder = await api('PATCH', `/admin/orders/${createdOrderId}/status`, {
    body: { status: 'confirmed' },
    rawCookie: adminCookie,
  });
  check('admin can update order to confirmed', confirmOrder.status === 200);
  const afterConfirmListing = await api('GET', `/listings/${targetProduct.slug}`, { useCookies: false });
  check('order status change does not double-deduct stock (still 7)', afterConfirmListing.json?.data?.listing?.stockQuantity === 7);

  const cancelOrder = await api('PATCH', `/admin/orders/${createdOrderId}/status`, {
    body: { status: 'cancelled' },
    rawCookie: adminCookie,
  });
  check('admin can cancel order and restock', cancelOrder.status === 200);
  const afterCancelListing = await api('GET', `/listings/${targetProduct.slug}`, { useCookies: false });
  check('order cancellation restores stock exactly once (7 -> 10)', afterCancelListing.json?.data?.listing?.stockQuantity === 10);

  await api('PATCH', `/admin/orders/${createdOrderId}/status`, {
    body: { status: 'cancelled' },
    rawCookie: adminCookie,
  });
  const afterRepeatCancel = await api('GET', `/listings/${targetProduct.slug}`, { useCookies: false });
  check('repeated cancellation does not double-restock (still 10)', afterRepeatCancel.json?.data?.listing?.stockQuantity === 10);

  await mongoose.connection.collection('listings').updateOne(
    { _id: new mongoose.Types.ObjectId(targetProduct._id) },
    { $set: { stockQuantity: 0 } }
  );
  const outOfStockOrder = await api('POST', '/orders', {
    body: {
      ...orderPayload,
      items: [{ listingId: targetProduct._id, quantity: 1 }],
    },
    useCookies: false,
  });
  check('backend rejects order when product stock is 0 (400)', outOfStockOrder.status === 400);

  await mongoose.connection.collection('listings').updateOne(
    { _id: new mongoose.Types.ObjectId(targetProduct._id) },
    { $set: { stockQuantity: 10 } }
  );

  const liveAnimals = (allListingsRes.json?.data?.listings ?? []).find((l) => l.category === 'Animalss');
  check('found live Animals listing', Boolean(liveAnimals));
  const AnimalsOrder = await api('POST', '/orders', {
    body: {
      ...orderPayload,
      items: [{ listingId: liveAnimals._id, quantity: 1 }],
    },
    useCookies: false,
  });
  check('backend rejects order for live Animalss (400)', AnimalsOrder.status === 400 && /live Animals/i.test(AnimalsOrder.json?.message ?? ''));

  await mongoose.disconnect();
}
try {
  assertSafeTarget();
} catch (error) {
  console.error(`\n✗ ${error.message}\n`);
  process.exit(1);
}

run()
  .then(() => {
    const failed = results.filter((r) => !r.pass);
    console.log(`\n${'='.repeat(60)}\nSMOKE TEST COMPLETE: ${results.length - failed.length}/${results.length} passed`);
    if (failed.length) {
      console.log('FAILED CHECKS:');
      failed.forEach((f) => console.log(`  ✗ ${f.name}${f.detail ? ` — ${f.detail}` : ''}`));
      process.exit(1);
    }
    console.log('All checks passed. Re-run `npm run seed` to restore demo data.');
  })
  .catch((error) => {
    console.error('\nSMOKE TEST CRASHED:', error);
    process.exit(1);
  });
