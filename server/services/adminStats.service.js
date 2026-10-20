import { Animals_CATEGORY } from '../constants/listings.js';
import Blog from '../models/Blog.js';
import Inquiry from '../models/Inquiry.js';
import Listing from '../models/Listing.js';
import Report from '../models/Report.js';
import User from '../models/User.js';

const MONTHS_BACK = 6;

/** First instant (UTC) of the month `n` months before the current one — matches Mongo's $year/$month. */
function monthsAgoStart(n) {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - n, 1));
}

/** Documents created per month over the last MONTHS_BACK months (by createdAt). */
function monthlyCounts(Model) {
  return Model.aggregate([
    { $match: { createdAt: { $gte: monthsAgoStart(MONTHS_BACK - 1) } } },
    {
      $group: {
        _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
  ]);
}

/** Turn grouped rows into a zero-filled [{ label, count }] list so the chart has no gaps. */
function fillMonths(rows) {
  const byMonth = Object.fromEntries(rows.map((row) => [`${row._id.y}-${row._id.m}`, row.count]));
  return Array.from({ length: MONTHS_BACK }, (_, i) => {
    const start = monthsAgoStart(MONTHS_BACK - 1 - i);
    return {
      label: start.toLocaleString('en-IN', { month: 'short', timeZone: 'UTC' }),
      count: byMonth[`${start.getUTCFullYear()}-${start.getUTCMonth() + 1}`] ?? 0,
    };
  });
}

/**
 * Dashboard overview counters plus a peek at the newest listings and
 * reports so admins can spot activity without drilling into each page.
 */
export async function getAdminStats() {
  const [
    totalUsers,
    blockedUsers,
    totalListings,
    activeListings,
    soldListings,
    archivedListings,
    totalBlogs,
    publishedBlogs,
    totalReports,
    openReports,
    totalInquiries,
    newInquiries,
    outOfStockCount,
    recentListings,
    recentReports,
    reportStatusRows,
    listingCategoryRows,
    listingMonthRows,
    inquiryStatusRows,
    userMonthRows,
  ] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ status: 'blocked' }),
    Listing.countDocuments({}),
    Listing.countDocuments({ status: 'active' }),
    Listing.countDocuments({ status: 'sold' }),
    Listing.countDocuments({ status: 'archived' }),
    Blog.countDocuments({}),
    Blog.countDocuments({ status: 'published' }),
    Report.countDocuments({}),
    Report.countDocuments({ status: 'open' }),
    Inquiry.countDocuments({}),
    Inquiry.countDocuments({ status: 'new' }),
    Listing.countDocuments({
      category: { $ne: Animals_CATEGORY },
      status: 'active',
      stockQuantity: { $lte: 0 },
    }),
    Listing.find({}).sort('-createdAt').limit(5).select('title slug status price createdAt'),
    Report.find({}).sort('-createdAt').limit(5)
      .populate('listing', 'title slug status')
      .populate('reporter', 'name'),
    // Analytics: reports per status (pie chart)
    Report.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    // Analytics: listings per category (bar graph)
    Listing.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
    // Analytics: listings created per month, last 6 months (bar graph)
    monthlyCounts(Listing),
    // Analytics: inquiries per status (pie chart)
    Inquiry.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    // Analytics: new users per month, last 6 months (bar graph)
    monthlyCounts(User),
  ]);

  const countBy = (rows) => Object.fromEntries(rows.map((row) => [row._id, row.count]));
  const reportsByStatus = countBy(reportStatusRows);
  const listingsByCategory = countBy(listingCategoryRows);
  const inquiriesByStatus = countBy(inquiryStatusRows);
  const listingsByMonth = fillMonths(listingMonthRows);
  const usersByMonth = fillMonths(userMonthRows);

  return {
    users: { total: totalUsers, blocked: blockedUsers },
    listings: {
      total: totalListings,
      active: activeListings,
      sold: soldListings,
      archived: archivedListings,
    },
    blogs: { total: totalBlogs, published: publishedBlogs },
    reports: { total: totalReports, open: openReports },
    inquiries: { total: totalInquiries, new: newInquiries },
    inventory: { outOfStock: outOfStockCount },
    analytics: {
      reportsByStatus,
      listingsByCategory,
      listingsByMonth,
      inquiriesByStatus,
      usersByMonth,
    },
    recentListings,
    recentReports,
  };
}
