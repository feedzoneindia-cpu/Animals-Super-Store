/**
 * Development seed script.
 *
 *   npm run seed
 *
 * Clears existing Users, Listings, Blogs, and Reports, then inserts one admin
 * account, sample users, sample listings across every category and status
 * (Animals-related products plus live Animals listings), sample blog posts, and
 * sample reports.
 * Credentials come from environment variables so production secrets are
 * never hardcoded; the defaults below are for local development only.
 *
 * IMAGES: the source URLs below (Wikimedia Commons / picsum) are only used as
 * upload sources. Before a document is written, every image is uploaded to
 * Cloudinary and the stored `url` is Cloudinary's `secure_url` (with its
 * `publicId`), exactly like images uploaded through the API. Needs the
 * CLOUDINARY_* variables in .env. Uploads are cached per URL within one run.
 */
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { LISTING_CATEGORIES, LISTING_STATUSES } from '../constants/listings.js';
import Blog from '../models/Blog.js';
import Listing from '../models/Listing.js';
import Report from '../models/Report.js';
import User from '../models/User.js';
import { uploadImageFromUrl } from '../services/cloudinary.service.js';
import { generateUniqueSlug, slugify } from '../utils/slug.js';

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@animalssuperstore.local';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@12345';
const USER_PASSWORD = process.env.SEED_USER_PASSWORD ?? 'User@12345';

// Blog covers keep a generic picsum placeholder — blog covers are editorial
// artwork, not marketplace listing photos, so randomness is acceptable there.
const picsum = (seed) => ({ url: `https://picsum.photos/seed/${seed}/800/600`, publicId: '' });

// Listing images are real, product-relevant photos. Every listing carries its
// own `images` array so a card always shows an image that matches its product.
const image = (url) => ({ url, publicId: '' });
// Wikimedia Commons thumbnail URL: <hash-dirs>/<file>/<width>px-<file>
const wiki = (path) => image(`https://upload.wikimedia.org/wikipedia/commons/thumb/${path}`);

const uploadCache = new Map();
/** { url, publicId } (remote source) -> { url: secure_url, publicId } */
async function toCloudinary(img, folder) {
  if (!uploadCache.has(img.url)) {
    uploadCache.set(img.url, uploadImageFromUrl(img.url, `Animals-super-store/${folder}`));
  }
  return uploadCache.get(img.url);
}

const SAMPLE_LISTINGS = [
  {
    title: 'Premium Dog Food 20kg Pack',
    category: 'Animals Food',
    description:
      'High-protein adult dog food in a 20 kg bag. Balanced nutrition with real chicken, omega fatty acids for a shiny coat, and no artificial preservatives. Sealed, unopened pack with six months before expiry.',
    price: 2450,
    location: 'Lucknow',
    sellerIndex: 0,
    status: 'active',
    images: [wiki('4/4b/Dog_Food_%281%29.jpg/960px-Dog_Food_%281%29.jpg')],
  },
  {
    title: 'Stainless Steel Dog Bowl Set',
    category: 'Animals Accessories',
    description:
      'Set of two heavy-duty stainless steel bowls — one for food and one for water. Non-slip silicone base, dishwasher safe, and rust resistant. Suitable for medium and large dogs.',
    price: 649,
    location: 'Delhi',
    sellerIndex: 0,
    status: 'active',
    images: [wiki('c/ce/Dog_bowls_1_2022-12-04.jpeg/960px-Dog_bowls_1_2022-12-04.jpeg')],
  },
  {
    title: 'Leather Dog Collar and Leash Combo',
    category: 'Animals Accessories',
    description:
      'Hand-stitched genuine leather collar with matching 5-foot leash. Padded inner lining for comfort, heavy-duty buckle, and a separate ID tag ring. Available in tan and black.',
    price: 899,
    location: 'Mumbai',
    sellerIndex: 1,
    status: 'active',
    images: [wiki('2/22/Leather_dog_collar_made_by_Les_cuirs_d%27Agathe_%28DSC06406%29.jpg/960px-Leather_dog_collar_made_by_Les_cuirs_d%27Agathe_%28DSC06406%29.jpg')],
  },
  {
    title: 'Large Bird Cage with Stand',
    category: 'Animals Equipment',
    description:
      'Spacious wrought-iron bird cage on wheels with removable tray, two wooden perches, and four steel feeding cups. Powder-coated, easy to clean, suitable for parrots and cockatiels.',
    price: 3800,
    location: 'Kolkata',
    sellerIndex: 1,
    status: 'active',
    images: [wiki('0/09/Love_Birds_in_Cage.jpg/960px-Love_Birds_in_Cage.jpg')],
  },
  {
    title: 'Aquarium Canister Filter 1200L/H',
    category: 'Animals Equipment',
    description:
      'External canister filter for tanks up to 300 litres. Three-stage filtration with mechanical, biological, and chemical media included. Whisper-quiet operation, used for four months, works perfectly.',
    price: 2100,
    location: 'Bengaluru',
    sellerIndex: 0,
    status: 'sold',
    images: [wiki('a/a9/Aquarium_-_external_filter.jpg/960px-Aquarium_-_external_filter.jpg')],
  },
  {
    title: 'Cat Scratching Post with Ball Toy',
    category: 'Animals Accessories',
    description:
      'Sisal-wrapped scratching post with a hanging ball toy and a cozy base platform. Sturdy build that survives enthusiastic climbers. Assembled, in excellent condition.',
    price: 1150,
    location: 'Pune',
    sellerIndex: 1,
    status: 'sold',
    images: [wiki('c/ca/Homemade_scratching_post.jpg/960px-Homemade_scratching_post.jpg')],
  },
  {
    title: 'Cattle Mineral Feed Supplement 25kg',
    category: 'Animals Food',
    description:
      'Nutritional mineral and vitamin supplement for dairy cattle. Supports milk yield, bone strength, and immunity. Sealed 25 kg bag, manufactured last month, mixing instructions printed on the pack.',
    price: 1650,
    location: 'Kanpur',
    sellerIndex: 0,
    status: 'active',
    images: [wiki('e/e7/Corn_By-Product_Used_for_Livestock_Feed.jpg/960px-Corn_By-Product_Used_for_Livestock_Feed.jpg')],
  },
  {
    title: 'Wooden Rabbit Hutch with Run',
    category: 'Animals Equipment',
    description:
      'Two-level weather-treated wooden hutch with an attached run area, pull-out cleaning tray, and secure latches. Waterproof asphalt roof. Ideal for two rabbits or guinea pigs.',
    price: 4600,
    location: 'Jaipur',
    sellerIndex: 1,
    status: 'active',
    images: [wiki('a/a4/Rabbit_hutch_at_Boreham%2C_Essex%2C_England_2.jpg/960px-Rabbit_hutch_at_Boreham%2C_Essex%2C_England_2.jpg')],
  },
  {
    title: 'Horse Grooming Kit Complete Set',
    category: 'Animals Accessories',
    description:
      'Complete grooming kit with curry comb, dandy brush, body brush, hoof pick, and mane comb — all in a zippered canvas bag. Stainless steel tools with wooden handles, barely used.',
    price: 1750,
    location: 'Bhopal',
    sellerIndex: 0,
    status: 'archived',
    images: [image('https://upload.wikimedia.org/wikipedia/commons/5/5c/HorseGroomingTools.jpg')],
  },
  {
    title: 'Pet Travel Carrier Bag Medium',
    category: 'Other',
    description:
      'Airline-approved pet carrier for cats and small dogs up to 8 kg. Breathable mesh panels, locking zippers, fleece base, and a shoulder strap. Folds flat for storage.',
    price: 980,
    location: 'Hyderabad',
    sellerIndex: 1,
    status: 'active',
    images: [wiki('6/66/Air_Travel_With_A_Cat.jpg/960px-Air_Travel_With_A_Cat.jpg')],
  },
  {
    title: 'Automatic Poultry Feeder 10kg',
    category: 'Animals Equipment',
    description:
      'Gravity-fed automatic poultry feeder with a 10 kg capacity and rain cover. Reduces feed waste and keeps pellets dry. Galvanised steel body built to last outdoors.',
    price: 1250,
    location: 'Nagpur',
    sellerIndex: 0,
    status: 'archived',
    images: [wiki('6/69/Comedero_met%C3%A1lico_de_tolva_para_aves.jpg/960px-Comedero_met%C3%A1lico_de_tolva_para_aves.jpg')],
  },
  {
    title: 'Handwoven Cotton Pet Blanket',
    category: 'Other',
    description:
      'Soft handwoven cotton blanket for pets, machine washable, in a checked pattern. Large size suitable for dogs and cats to curl up on. Two blankets available, price is per piece.',
    price: 450,
    location: 'Chennai',
    sellerIndex: 1,
    status: 'active',
    images: [wiki('0/02/A_dog_wrapped_up_into_a_blanket.jpg/960px-A_dog_wrapped_up_into_a_blanket.jpg')],
  },
  // --- Animalss (category === 'Animalss') -------------------------------------
  // Animals listings carry the extra Animals fields. Every image is a photo of
  // the actual Animals being listed — never a generic or unrelated picture.
  {
    title: 'Golden Retriever Puppy',
    category: 'Animalss',
    AnimalsType: 'Dog',
    breed: 'Golden Retriever',
    ageMonths: 4,
    gender: 'Male',
    description:
      'Four-month-old golden retriever puppy, home-bred and raised around children. Fully weaned, first vaccinations and deworming done, and used to a leash. Very playful and responds to basic commands.',
    price: 25000,
    location: 'Pune',
    sellerIndex: 0,
    status: 'active',
    images: [wiki('5/52/Golden_Retriever_Puppy_2012_03.jpg/960px-Golden_Retriever_Puppy_2012_03.jpg')],
  },
  {
    title: 'Healthy Dairy Cow',
    category: 'Animalss',
    AnimalsType: 'Cow',
    breed: 'Sahiwal',
    ageMonths: 36,
    gender: 'Female',
    description:
      'Three-year-old Sahiwal cow in her second lactation, currently giving around 12 litres a day. Vet-checked last month, all vaccinations up to date, and calm during milking. Selling because the herd is being reduced.',
    price: 65000,
    location: 'Karnal',
    sellerIndex: 1,
    status: 'active',
    images: [wiki('e/eb/A_dairy_cow_in_Bemmel.jpg/960px-A_dairy_cow_in_Bemmel.jpg')],
  },
  {
    title: 'Pair of Lovebirds',
    category: 'Animalss',
    AnimalsType: 'Bird',
    breed: 'Rosy-faced Lovebird',
    ageMonths: 8,
    gender: 'Pair',
    description:
      'A bonded pair of rosy-faced lovebirds, eight months old and hand-tamed. They step up onto a finger and are used to being handled daily. Selling as a pair only, with their cage if wanted.',
    price: 3200,
    location: 'Kochi',
    sellerIndex: 0,
    status: 'active',
    images: [wiki('3/34/Rosy-faced_lovebirds_%28Agapornis_roseicollis_roseicollis%29_composite.jpg/960px-Rosy-faced_lovebirds_%28Agapornis_roseicollis_roseicollis%29_composite.jpg')],
  },
  {
    title: 'Mini Rex Rabbit',
    category: 'Animalss',
    AnimalsType: 'Rabbit',
    breed: 'Mini Rex',
    ageMonths: 6,
    gender: 'Female',
    description:
      'Six-month-old Mini Rex doe with the breed typical plush velvet coat. Litter trained, eats pellets and hay well, and is comfortable being picked up. Healthy and active, no health issues so far.',
    price: 2800,
    location: 'Nashik',
    sellerIndex: 1,
    status: 'active',
    images: [wiki('4/41/Rex_rabbit_%28calico%29.jpg/960px-Rex_rabbit_%28calico%29.jpg')],
  },
  {
    title: 'Healthy Boer Goat',
    category: 'Animalss',
    AnimalsType: 'Goat',
    breed: 'Boer',
    ageMonths: 18,
    gender: 'Male',
    description:
      'Eighteen-month-old Boer buck with a strong frame and good muscle cover. Dewormed on schedule and kept on open pasture. Well suited to a breeding programme or as a starter herd sire.',
    price: 18000,
    location: 'Madurai',
    sellerIndex: 0,
    status: 'sold',
    images: [wiki('f/f9/Boer_goat.jpg/960px-Boer_goat.jpg')],
  },
];

const SAMPLE_BLOGS = [
  {
    title: 'A Beginner Guide to Choosing the Right Dog Food',
    excerpt:
      'Walk into any store and the dog food aisle is overwhelming. Here is how to read a label, match food to your dog life stage, and avoid common marketing traps.',
    category: 'Pet Care',
    tags: ['dogs', 'nutrition', 'beginners'],
    status: 'published',
    coverSeed: 'blog-dog-food',
    content: `
      <p>Choosing dog food should not feel like a chemistry exam. Yet most labels bury the useful information under marketing claims. This guide breaks it down into four practical checks.</p>
      <h2>1. Read the ingredient list, not the front of the bag</h2>
      <p>Ingredients are listed by weight before cooking. A named protein source — chicken, lamb, fish — should appear first. Vague terms like "meat meal" tell you very little about quality.</p>
      <blockquote>The front of the package is advertising. The ingredient list and guaranteed analysis are the actual product.</blockquote>
      <h2>2. Match food to the life stage</h2>
      <ul>
        <li><strong>Puppies</strong> need higher protein and calorie density for growth.</li>
        <li><strong>Adults</strong> do well on balanced maintenance formulas.</li>
        <li><strong>Seniors</strong> often benefit from joint support and easier digestion.</li>
      </ul>
      <h2>3. Watch the fillers</h2>
      <p>Corn and rice are not evil, but when they push protein down to the third or fourth ingredient, you are mostly paying for starch. Compare protein percentages across similar products before deciding.</p>
      <h2>4. Transition slowly</h2>
      <p>Whatever you choose, switch gradually over 7–10 days by mixing increasing amounts of the new food into the old one. Sudden changes are the most common cause of upset stomachs.</p>
    `,
  },
  {
    title: 'Five Cage Setup Mistakes Every New Bird Owner Makes',
    excerpt:
      'From bar spacing to perch placement, small cage mistakes quietly stress birds out. Here are the five we see most often — and how to fix each one.',
    category: 'Birds',
    tags: ['birds', 'equipment', 'setup'],
    status: 'published',
    coverSeed: 'blog-bird-cage',
    content: `
      <p>A well-set cage is the difference between a comfortable bird and a constantly stressed one. These are the mistakes we see most often from first-time bird owners.</p>
      <h2>1. Cages that are too small</h2>
      <p>Width matters more than height. A bird flies horizontally, so a wide cage with room to flap beats a tall narrow tower every time.</p>
      <h2>2. Wrong bar spacing</h2>
      <p>Bars spaced too far apart let small birds squeeze their heads through — a genuine injury risk. Match spacing to species: roughly 1–1.5 cm for budgies and cockatiels.</p>
      <h2>3. All dowel perches</h2>
      <p>Identical smooth dowels force the same foot position all day. Mix diameters and materials — natural wood branches are ideal — to exercise the feet.</p>
      <h2>4. Placing food under perches</h2>
      <p>Food and water cups directly beneath the main perch collect droppings. Mount them at the opposite end of the cage.</p>
      <h2>5. Cages on the floor or in a dark corner</h2>
      <p>Birds feel safe at eye level against a wall, with a view of the room. Floor-level cages make every footstep a threat.</p>
    `,
  },
  {
    title: 'How to Groom a Horse Without a Battle',
    excerpt:
      'Grooming is bonding, not chores. A calm, repeatable routine turns even a fidgety horse into a willing partner in a few weeks.',
    category: 'Horses',
    tags: ['horses', 'grooming'],
    status: 'published',
    coverSeed: 'blog-horse-grooming',
    content: `
      <p>Grooming does more than clean a coat — it lets you check for injuries, ticks, and skin conditions while building trust. The secret is routine.</p>
      <h2>Follow the same order every time</h2>
      <p>Horses relax when they can predict what comes next. Start at the neck, work toward the hindquarters, and always brush with the hair growth.</p>
      <h2>Use the right tools</h2>
      <ol>
        <li><strong>Rubber curry comb</strong> — circular motions to lift dust and loose hair. Never on legs or face.</li>
        <li><strong>Dandy brush</strong> — short flicking strokes to throw the dirt off the coat.</li>
        <li><strong>Body brush</strong> — smooths and brings out shine.</li>
        <li><strong>Hoof pick</strong> — heel-to-toe, every single day.</li>
      </ol>
      <h2>Reward calm behaviour</h2>
      <p>A quiet word or a scratch on the withers at the right moment teaches more than any restraint ever will. End every session on a good note, even a short one.</p>
    `,
  },
  {
    title: 'Dairy Cattle Nutrition Basics Every Farmer Should Know',
    excerpt:
      'A draft covering rumen health, mineral supplementation, and feeding schedules for better milk yield — being prepared for publication.',
    category: 'Livestock',
    tags: ['cattle', 'nutrition', 'farming'],
    status: 'draft',
    coverSeed: 'blog-cattle',
    content: `
      <p>Draft in progress — covering rumen pH, roughage-to-concentrate ratios, and mineral supplementation timing for lactating cows.</p>
      <h2>Planned sections</h2>
      <ul>
        <li>Roughage first: why fibre drives milk fat</li>
        <li>Concentrate feeding around milking times</li>
        <li>Reading mineral deficiency signs early</li>
        <li>Water: the cheapest and most ignored nutrient</li>
      </ul>
    `,
  },
  {
    title: 'Old News: Winter Pet Care Checklist 2024',
    excerpt:
      'A seasonal checklist from last winter, kept here for reference. Superseded by the updated guide coming next season.',
    category: 'Pet Care',
    tags: ['seasonal', 'archive'],
    status: 'archived',
    coverSeed: 'blog-winter',
    content: `
      <p>This article has been archived. It remains available to the editorial team but is no longer publicly listed.</p>
    `,
  },
];

async function seed() {
  console.log('[seed] Connecting to MongoDB…');
  await mongoose.connect(env.mongoUri);
  mongoose.set('strictQuery', true);

  console.log('[seed] Clearing existing data…');
  await Promise.all([User.deleteMany({}), Listing.deleteMany({}), Blog.deleteMany({}), Report.deleteMany({})]);

  console.log('[seed] Creating users…');
  const [admin, priya, rahul] = await User.create([
    {
      name: 'Store Admin',
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      phone: '9000000001',
      role: 'ADMIN',
    },
    {
      name: 'Priya Sharma',
      email: 'priya@example.com',
      password: USER_PASSWORD,
      phone: '9876543210',
    },
    {
      name: 'Rahul Verma',
      email: 'rahul@example.com',
      password: USER_PASSWORD,
      phone: '9812345678',
    },
  ]);

  const sellers = [priya, rahul];

  console.log('[seed] Creating blogs…');
  for (const sample of SAMPLE_BLOGS) {
    await Blog.create({
      title: sample.title,
      slug: await generateUniqueSlug(slugify(sample.title), Blog),
      excerpt: sample.excerpt,
      content: sample.content.trim(),
      coverImage: await toCloudinary(picsum(sample.coverSeed), 'blog'),
      category: sample.category,
      tags: sample.tags,
      author: admin._id,
      status: sample.status,
      publishedAt: sample.status === 'published' ? new Date(Date.now() - Math.random() * 60 * 86_400_000) : null,
    });
  }

  console.log('[seed] Creating listings…');
  for (const sample of SAMPLE_LISTINGS) {
    const seller = sellers[sample.sellerIndex];
    await Listing.create({
      title: sample.title,
      slug: await generateUniqueSlug(slugify(sample.title), Listing),
      category: sample.category,
      description: sample.description,
      price: sample.price,
      location: sample.location,
      images: await Promise.all(sample.images.map((img) => toCloudinary(img, 'listings'))),
      seller: seller._id,
      sellerName: seller.name,
      contactNumber: seller.phone,
      contactEmail: seller.email,
      additionalDetails: '',
      // Undefined for product listings, so only Animals listings carry these.
      AnimalsType: sample.AnimalsType,
      breed: sample.breed,
      ageMonths: sample.ageMonths,
      gender: sample.gender,
      status: sample.status,
      views: Math.floor(Math.random() * 120),
    });
  }

  console.log('[seed] Creating reports…');
  // Report a few of the just-created listings, mixing statuses and reporters.
  const reportable = await Listing.find({ status: { $in: ['active', 'sold'] } }).limit(4);
  const SAMPLE_REPORTS = [
    { reason: 'Spam', description: 'Same ad posted repeatedly in different cities.', status: 'open' },
    { reason: 'Incorrect information', description: 'The description says 20kg but the photo shows a 10kg bag.', status: 'open' },
    { reason: 'Fake listing', description: 'Seller asked for full advance payment and refuses calls.', status: 'reviewed' },
    { reason: 'Other', description: 'Contact number in the listing seems to be wrong.', status: 'resolved' },
  ];
  for (let i = 0; i < Math.min(reportable.length, SAMPLE_REPORTS.length); i += 1) {
    await Report.create({
      listing: reportable[i]._id,
      reporter: sellers[i % sellers.length]._id,
      ...SAMPLE_REPORTS[i],
    });
  }

  console.log('[seed] Done. Accounts created:');
  console.log(`[seed]   ADMIN  ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log(`[seed]   USER   priya@example.com / ${USER_PASSWORD}`);
  console.log(`[seed]   USER   rahul@example.com / ${USER_PASSWORD}`);
  console.log(
    `[seed] Listings: ${SAMPLE_LISTINGS.length} across categories [${LISTING_CATEGORIES.join(', ')}] and statuses [${LISTING_STATUSES.join(', ')}]`
  );
  console.log(
    `[seed] Blogs: ${SAMPLE_BLOGS.length} across statuses [${[...new Set(SAMPLE_BLOGS.map((b) => b.status))].join(', ')}]`
  );
  console.log(`[seed] Reports: ${SAMPLE_REPORTS.length}`);

  await mongoose.disconnect();
}

seed().catch((error) => {
  console.error('[seed] Failed:', error.message);
  process.exit(1);
});
