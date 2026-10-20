/**
 * Adds dummy data to EVERY collection (users, listings, blogs, orders,
 * reports, inquiries) — 55 documents each by default. Existing data is kept.
 *
 *   npm run seed-dummy                  # add 55 of each
 *   npm run seed-dummy -- --count=60    # 50–60 are sensible; any number works
 *   npm run seed-dummy -- --reset       # first remove previously generated dummy data
 *   npm run seed-dummy -- --no-upload   # skip Cloudinary (uses the source image URLs as-is)
 *
 * Images: a small pool of source photos is uploaded to Cloudinary ONCE and the
 * resulting `secure_url`s are reused across documents, so the database only
 * ever stores Cloudinary URLs. Needs CLOUDINARY_* in .env (or pass --no-upload).
 *
 * Everything generated is identifiable: users use @dummy.example.com emails,
 * listings/blogs have slugs ending in "-dmy<N>", orders are numbered ASO-DMY-…,
 * inquiries use @dummy.example.com — which is what --reset removes.
 * Login for any dummy user: password "Dummy@12345".
 */
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { Animals_CATEGORY } from '../constants/listings.js';
import { REPORT_REASONS, REPORT_STATUSES } from '../constants/reports.js';
import Blog from '../models/Blog.js';
import Inquiry, { INQUIRY_STATUSES } from '../models/Inquiry.js';
import Listing from '../models/Listing.js';
import Order, { ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES } from '../models/Order.js';
import Report from '../models/Report.js';
import User from '../models/User.js';
import { isCloudinaryConfigured, uploadImageFromUrl } from '../services/cloudinary.service.js';
import { slugify } from '../utils/slug.js';

const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const flag = (name) => process.argv.includes(`--${name}`);
const COUNT = Math.max(1, Number(arg('count')) || 55);
const DUMMY_DOMAIN = 'dummy.example.com';
const DUMMY_PASSWORD = 'Dummy@12345';

// Deterministic PRNG so runs are repeatable.
let seed = 20261018;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const int = (min, max) => Math.floor(rnd() * (max - min + 1)) + min;
const daysAgo = (d) => new Date(Date.now() - d * 86_400_000 - int(0, 86_000) * 1000);

// ---------------------------------------------------------------- source data
const wiki = (p) => `https://upload.wikimedia.org/wikipedia/commons/thumb/${p}`;
const IMAGE_SOURCES = {
  'Animals Food': [
    wiki('4/4b/Dog_Food_%281%29.jpg/960px-Dog_Food_%281%29.jpg'),
    wiki('e/e7/Corn_By-Product_Used_for_Livestock_Feed.jpg/960px-Corn_By-Product_Used_for_Livestock_Feed.jpg'),
  ],
  'Animals Accessories': [
    wiki('c/ce/Dog_bowls_1_2022-12-04.jpeg/960px-Dog_bowls_1_2022-12-04.jpeg'),
    wiki('0/02/A_dog_wrapped_up_into_a_blanket.jpg/960px-A_dog_wrapped_up_into_a_blanket.jpg'),
    wiki('c/ca/Homemade_scratching_post.jpg/960px-Homemade_scratching_post.jpg'),
  ],
  'Animals Equipment': [
    wiki('a/a4/Rabbit_hutch_at_Boreham%2C_Essex%2C_England_2.jpg/960px-Rabbit_hutch_at_Boreham%2C_Essex%2C_England_2.jpg'),
    wiki('6/69/Comedero_met%C3%A1lico_de_tolva_para_aves.jpg/960px-Comedero_met%C3%A1lico_de_tolva_para_aves.jpg'),
    wiki('a/a9/Aquarium_-_external_filter.jpg/960px-Aquarium_-_external_filter.jpg'),
  ],
  Animalss: [
    wiki('f/f9/Boer_goat.jpg/960px-Boer_goat.jpg'),
    wiki('e/eb/A_dairy_cow_in_Bemmel.jpg/960px-A_dairy_cow_in_Bemmel.jpg'),
    wiki('4/41/Rex_rabbit_%28calico%29.jpg/960px-Rex_rabbit_%28calico%29.jpg'),
  ],
  Other: [wiki('6/66/Air_Travel_With_A_Cat.jpg/960px-Air_Travel_With_A_Cat.jpg')],
  blog: [
    'https://picsum.photos/seed/asb-blog-1/800/600',
    'https://picsum.photos/seed/asb-blog-2/800/600',
    'https://picsum.photos/seed/asb-blog-3/800/600',
    'https://picsum.photos/seed/asb-blog-4/800/600',
  ],
};

const FIRST = ['Aarav', 'Priya', 'Rahul', 'Sneha', 'Vikram', 'Anjali', 'Rohit', 'Neha', 'Amit', 'Pooja', 'Karan', 'Divya', 'Suresh', 'Meena', 'Arjun', 'Kavya', 'Manish', 'Ritu', 'Deepak', 'Sunita', 'Imran', 'Farah', 'Gurpreet', 'Harleen', 'Tarun'];
const LAST = ['Sharma', 'Verma', 'Singh', 'Gupta', 'Yadav', 'Mishra', 'Patel', 'Khan', 'Kumar', 'Joshi', 'Reddy', 'Nair', 'Das', 'Mehta', 'Chauhan', 'Tiwari'];
const CITIES = [
  ['Lucknow', 'Uttar Pradesh', '226001'], ['Kanpur', 'Uttar Pradesh', '208001'], ['Varanasi', 'Uttar Pradesh', '221001'],
  ['Delhi', 'Delhi', '110001'], ['Jaipur', 'Rajasthan', '302001'], ['Pune', 'Maharashtra', '411001'],
  ['Mumbai', 'Maharashtra', '400001'], ['Bhopal', 'Madhya Pradesh', '462001'], ['Patna', 'Bihar', '800001'],
  ['Ludhiana', 'Punjab', '141001'], ['Hyderabad', 'Telangana', '500001'], ['Ahmedabad', 'Gujarat', '380001'],
];
const STREETS = ['MG Road', 'Station Road', 'Gandhi Nagar', 'Civil Lines', 'Model Town', 'Sector 12', 'Krishna Colony', 'Nehru Marg'];

const PRODUCT_NAMES = {
  'Animals Food': [
    ['Premium Goat Feed Pellets', 'High-protein pellets with balanced minerals for healthy growth and milk yield.'],
    ['Mineral Salt Lick Block', 'Essential mineral and salt block that supports bone strength and digestion.'],
    ['Natural Bhoosa Bale', 'Clean, dust-free wheat bhoosa sourced fresh and stored dry for livestock feeding.'],
    ['Adult Dog Food Chicken Recipe', 'Complete adult dog nutrition with real chicken, omega fatty acids and no artificial colours.'],
    ['Calcium & Vitamin Supplement', 'Daily vitamin and calcium tonic for goats, sheep and cattle, easy to mix with water.'],
    ['Layer Poultry Feed Crumble', 'Balanced crumble feed that supports steady egg production in backyard flocks.'],
    ['Rabbit Pellets Timothy Mix', 'Fibre-rich rabbit pellets with timothy hay for healthy digestion and teeth.'],
    ['Wild Bird Seed Blend', 'A mixed seed blend loved by lovebirds, finches and parakeets, cleaned and sealed.'],
  ],
  'Animals Accessories': [
    ['Leather Dog Collar', 'Durable leather collar with brass buckle and a soft padded lining for daily comfort.'],
    ['Stainless Steel Feeding Bowl', 'Non-slip stainless steel bowl, rust-proof and easy to wash for pets of all sizes.'],
    ['Cozy Pet Blanket', 'Soft fleece blanket that keeps dogs and cats warm during winter nights.'],
    ['Cat Scratching Post', 'Sturdy sisal-wrapped scratching post that protects your furniture and keeps claws healthy.'],
    ['Adjustable Dog Harness', 'No-pull adjustable harness with reflective stitching for safe evening walks.'],
    ['Goat Neck Chain & Bell', 'Strong neck chain with a loud brass bell for easy herd tracking in open pastures.'],
    ['Pet Grooming Brush', 'Gentle slicker brush that removes loose fur and keeps the coat shiny and tangle-free.'],
  ],
  'Animals Equipment': [
    ['Rabbit Hutch with Run', 'Weatherproof wooden hutch with a removable tray and attached run for outdoor use.'],
    ['Poultry Hopper Feeder', 'Galvanised metal hopper feeder that reduces waste and keeps feed clean and dry.'],
    ['Aquarium External Filter', 'Quiet external canister filter suitable for tanks up to 200 litres.'],
    ['Automatic Water Dispenser', 'Gravity-fed water dispenser that gives livestock fresh water all day long.'],
    ['Hoof Trimming Shears', 'Heavy-duty stainless hoof shears with ergonomic handles for goats and sheep.'],
    ['Portable Goat Feeding Trough', 'Light, durable trough with sturdy hooks that fit most fences and pens.'],
    ['Bird Cage Large', 'Spacious powder-coated bird cage with perches, feeders and a pull-out cleaning tray.'],
  ],
  Other: [
    ['Pet Travel Carrier', 'Airline-style carrier with ventilation and a secure latch for safe pet travel.'],
    ['Livestock Care Handbook', 'A practical handbook on feeding, vaccination and common care for farm Animalss.'],
    ['Pet First Aid Kit', 'Compact first aid kit with bandages, antiseptic wipes and quick-reference guide.'],
    ['Farm Cleaning Disinfectant', 'Concentrated, Animals-safe disinfectant for sheds, pens and feeding areas.'],
  ],
};
const Animals_LISTINGS = [
  ['Boer Goat', 'Goat', 'Boer', [6, 36]], ['Sirohi Goat', 'Goat', 'Sirohi', [5, 30]], ['Beetal Goat', 'Goat', 'Beetal', [6, 40]],
  ['Jamunapari Goat', 'Goat', 'Jamunapari', [8, 40]], ['Murrah Buffalo', 'Buffalo', 'Murrah', [24, 90]], ['Sahiwal Cow', 'Cow', 'Sahiwal', [24, 96]],
  ['Rex Rabbit', 'Rabbit', 'Rex', [3, 24]], ['Golden Retriever Puppy', 'Dog', 'Golden Retriever', [2, 10]], ['Lovebird Pair', 'Bird', 'Rosy-faced Lovebird', [6, 36]],
];

const BLOG_TOPICS = [
  ['Goat Care', 'How to keep goats healthy through the monsoon'], ['Feeding', 'A simple daily feeding schedule for dairy goats'],
  ['Feeding', 'Mineral blocks: why every herd needs them'], ['Health', 'Five early signs of illness in goats'],
  ['Farming', 'Building a low-cost goat shed that lasts'], ['Breeds', 'Beetal vs Sirohi: choosing the right goat breed'],
  ['Pets', 'First-month checklist for a new puppy'], ['Poultry', 'Backyard poultry basics for beginners'],
  ['Health', 'Vaccination calendar for goats and sheep'], ['Farming', 'Green fodder you can grow in 30 days'],
  ['Pets', 'Keeping rabbits happy in hot weather'], ['Dairy', 'Raising milk yield naturally in goats'],
];
const INQUIRY_SUBJECTS = ['Bulk order enquiry', 'Order status', 'Product availability', 'Delivery to my city', 'Return request', 'Feed recommendation for goats', 'Wholesale pricing', 'Payment issue', 'Visit the store', 'Listing partnership'];
const INQUIRY_MESSAGES = [
  'Hello, I would like to know if you can deliver 20 bags to my farm and what the price would be.',
  'Could you please share the current status of my order? I placed it a few days ago.',
  'Is this product available in a larger pack? I need it for a herd of about 30 goats.',
  'Do you deliver to my area, and how many days does shipping usually take?',
  'The item arrived with a damaged seal. How can I request a return or replacement?',
  'Which feed do you recommend for young kids under six months? Looking for good value.',
  'We run a small shop and want wholesale rates. Please share your best price list.',
  'My payment went through but the order still shows as pending. Please check.',
  'What are your store timings? I plan to visit this weekend to pick up supplies.',
  'We would like to list our products on your store. Whom should we contact?',
];
const REPORT_NOTES = [
  'The same ad keeps appearing multiple times in different cities.',
  'Photo does not match the description in the listing.',
  'Seller asked for full advance payment and stopped responding.',
  'Contact number in the listing is not reachable.',
  'The listing text contains offensive wording.',
  'Price looks too good to be true; I suspect a scam.',
  '',
];

// ------------------------------------------------------------------ helpers
const phone = () => `9${int(100000000, 999999999)}`;
const personName = () => `${pick(FIRST)} ${pick(LAST)}`;

async function resolveImagePool() {
  const pool = {};
  const upload = !flag('no-upload');
  if (upload && !isCloudinaryConfigured()) {
    console.error('Cloudinary is not configured. Set CLOUDINARY_* in .env, or re-run with --no-upload.');
    process.exit(1);
  }
  for (const [key, urls] of Object.entries(IMAGE_SOURCES)) {
    pool[key] = [];
    for (const url of urls) {
      if (!upload) {
        pool[key].push({ url, publicId: '' });
        continue;
      }
      const res = await uploadImageFromUrl(url, `Animals-super-store/${key === 'blog' ? 'blog' : 'listings'}`);
      console.log(`[dummy] uploaded -> ${res.url}`);
      pool[key].push(res);
    }
  }
  return pool;
}

async function resetDummy() {
  console.log('[dummy] removing previous dummy data…');
  const users = await User.find({ email: new RegExp(`@${DUMMY_DOMAIN.replace('.', '\\.')}$`) }).select('_id');
  const ids = users.map((u) => u._id);
  const listings = await Listing.find({ slug: /-dmy\d+$/ }).select('_id');
  await Promise.all([
    Report.deleteMany({ $or: [{ reporter: { $in: ids } }, { listing: { $in: listings.map((l) => l._id) } }] }),
    Order.deleteMany({ orderNumber: /^ASO-DMY-/ }),
    Blog.deleteMany({ slug: /-dmy\d+$/ }),
    Listing.deleteMany({ slug: /-dmy\d+$/ }),
    Inquiry.deleteMany({ email: new RegExp(`@${DUMMY_DOMAIN.replace('.', '\\.')}$`) }),
  ]);
  await User.deleteMany({ _id: { $in: ids } });
}

// --------------------------------------------------------------------- main
async function main() {
  await mongoose.connect(env.mongoUri);
  mongoose.set('strictQuery', true);
  if (flag('reset')) await resetDummy();

  const images = await resolveImagePool();
  const passwordHash = await bcrypt.hash(DUMMY_PASSWORD, 10);

  // 1. Users ---------------------------------------------------------------
  console.log(`[dummy] users (${COUNT})…`);
  const users = await User.insertMany(
    Array.from({ length: COUNT }, (_, i) => ({
      name: personName(),
      email: `dummy.user${i + 1}@${DUMMY_DOMAIN}`,
      password: passwordHash, // insertMany skips the pre-save hook, so this is stored as-is (already hashed)
      phone: phone(),
      role: 'USER',
      status: i % 17 === 16 ? 'blocked' : 'active',
      createdAt: daysAgo(int(5, 300)),
    }))
  );

  // 2. Listings ------------------------------------------------------------
  console.log(`[dummy] listings (${COUNT})…`);
  const listingDocs = [];
  for (let i = 0; i < COUNT; i++) {
    const seller = pick(users);
    const isAnimals = i % 5 === 4; // every 5th is a live-Animals listing
    const base = {
      slug: '',
      location: pick(CITIES)[0],
      seller: seller._id,
      sellerName: seller.name,
      contactNumber: seller.phone,
      contactEmail: seller.email,
      additionalDetails: i % 3 === 0 ? 'Genuine buyers only. Please call between 9 AM and 8 PM.' : '',
      status: pick(['active', 'active', 'active', 'active', 'sold', 'archived']),
      views: int(0, 400),
      createdAt: daysAgo(int(1, 200)),
    };
    if (isAnimals) {
      const [title, AnimalsType, breed, [minAge, maxAge]] = pick(Animals_LISTINGS);
      base.title = `${title} for sale #${i + 1}`;
      base.category = Animals_CATEGORY;
      base.AnimalsType = AnimalsType;
      base.breed = breed;
      base.ageMonths = int(minAge, maxAge);
      base.gender = pick(['Male', 'Female', 'Female', 'Male', 'Pair']);
      base.description = `Healthy, vaccinated ${breed.toLowerCase()} raised in good conditions. Calm temperament and well fed. Viewing is welcome at our farm.`;
      base.price = int(4, 80) * 1000;
      base.stockQuantity = 0;
      base.images = [pick(images.Animalss)];
    } else {
      const category = pick(['Animals Food', 'Animals Food', 'Animals Accessories', 'Animals Equipment', 'Animals Equipment', 'Other']);
      const [name, description] = pick(PRODUCT_NAMES[category]);
      base.title = `${name} ${pick(['', '1kg', '5kg', '10kg', '20kg', 'Pack of 2', 'Large']).trim()} #${i + 1}`.replace(/\s+/g, ' ');
      base.category = category;
      base.description = description;
      base.price = int(3, 250) * 10;
      base.stockQuantity = base.status === 'sold' ? 0 : int(0, 60);
      base.images = [pick(images[category])];
    }
    base.slug = `${slugify(base.title).slice(0, 70)}-dmy${i + 1}`;
    listingDocs.push(base);
  }
  const listings = await Listing.insertMany(listingDocs);
  const purchasable = listings.filter((l) => l.category !== Animals_CATEGORY);

  // 3. Blogs ---------------------------------------------------------------
  console.log(`[dummy] blogs (${COUNT})…`);
  const authors = users.filter((u) => u.status === 'active');
  const blogDocs = Array.from({ length: COUNT }, (_, i) => {
    const [category, topic] = BLOG_TOPICS[i % BLOG_TOPICS.length];
    const title = `${topic}${i >= BLOG_TOPICS.length ? ` (Part ${Math.floor(i / BLOG_TOPICS.length) + 1})` : ''}`;
    const status = pick(['published', 'published', 'published', 'published', 'draft', 'archived']);
    const when = daysAgo(int(1, 250));
    return {
      title,
      slug: `${slugify(title)}-dmy${i + 1}`,
      excerpt: `Practical, farm-tested advice on ${topic.toLowerCase()} — written for small farmers and pet owners.`,
      content:
        `<h2>${topic}</h2>` +
        '<p>Good Animals care starts with a few consistent habits. In this guide we cover the basics step by step, with tips you can apply on your farm or at home straight away.</p>' +
        '<h3>Key points</h3><ul><li>Keep feed and water clean and available at all times.</li><li>Check Animalss daily for changes in appetite or behaviour.</li><li>Keep sheds dry, ventilated and cleaned regularly.</li></ul>' +
        '<p>If something looks wrong, speak to a qualified veterinarian early — small problems are far easier to treat.</p>',
      coverImage: pick(images.blog),
      category,
      tags: [category.toLowerCase(), 'Animals care', 'guide'],
      author: pick(authors)._id,
      status,
      publishedAt: status === 'published' ? when : null,
      createdAt: when,
    };
  });
  await Blog.insertMany(blogDocs);

  // 4. Orders --------------------------------------------------------------
  console.log(`[dummy] orders (${COUNT})…`);
  const orderDocs = Array.from({ length: COUNT }, (_, i) => {
    const buyer = pick(users);
    const [city, state, postalCode] = pick(CITIES);
    const chosen = Array.from({ length: int(1, 3) }, () => pick(purchasable));
    const items = [...new Map(chosen.map((l) => [String(l._id), l])).values()].map((l) => ({
      listing: l._id,
      title: l.title,
      slug: l.slug,
      price: l.price,
      quantity: int(1, 4),
      image: l.images[0].url,
      category: l.category,
    }));
    const subtotal = items.reduce((s, it) => s + it.price * it.quantity, 0);
    const paymentMethod = pick(PAYMENT_METHODS);
    const shippingFee = subtotal >= 1000 || paymentMethod === 'pickup' ? 0 : 99;
    const status = pick(ORDER_STATUSES);
    const when = daysAgo(int(0, 120));
    const d = when.toISOString().slice(0, 10).replace(/-/g, '');
    return {
      orderNumber: `ASO-DMY-${d}-${String(i + 1).padStart(4, '0')}`,
      user: rnd() < 0.8 ? buyer._id : null,
      customer: { name: buyer.name, email: buyer.email, phone: buyer.phone },
      shippingAddress: { street: `${int(1, 250)}, ${pick(STREETS)}`, city, state, postalCode, country: 'India', notes: i % 6 === 0 ? 'Please call before delivery.' : '' },
      items,
      paymentMethod,
      paymentStatus: status === 'completed' ? 'paid' : status === 'cancelled' ? pick(['failed', 'pending']) : pick(PAYMENT_STATUSES),
      status,
      inventoryDeducted: status !== 'cancelled',
      subtotal,
      shippingFee,
      total: subtotal + shippingFee,
      createdAt: when,
    };
  });
  await Order.insertMany(orderDocs);

  // 5. Reports -------------------------------------------------------------
  console.log(`[dummy] reports (${COUNT})…`);
  await Report.insertMany(
    Array.from({ length: COUNT }, () => ({
      listing: pick(listings)._id,
      reporter: pick(users)._id,
      reason: pick(REPORT_REASONS),
      description: pick(REPORT_NOTES),
      status: pick(REPORT_STATUSES),
      createdAt: daysAgo(int(0, 90)),
    }))
  );

  // 6. Inquiries -----------------------------------------------------------
  console.log(`[dummy] inquiries (${COUNT})…`);
  await Inquiry.insertMany(
    Array.from({ length: COUNT }, (_, i) => {
      const name = personName();
      return {
        name,
        email: `dummy.inquiry${i + 1}@${DUMMY_DOMAIN}`,
        phone: i % 4 === 0 ? '' : phone(),
        subject: pick(INQUIRY_SUBJECTS),
        message: pick(INQUIRY_MESSAGES),
        status: pick(INQUIRY_STATUSES),
        createdAt: daysAgo(int(0, 60)),
      };
    })
  );

  console.log(`\n[dummy] done — ${COUNT} each of users, listings, blogs, orders, reports, inquiries.`);
  console.log(`[dummy] dummy user login: dummy.user1@${DUMMY_DOMAIN} / ${DUMMY_PASSWORD}`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
