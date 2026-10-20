import { Suspense, lazy } from 'react';
import { Route, Routes, Navigate, useParams, useLocation } from 'react-router-dom';
import MainLayout from './layouts/MainLayout.jsx';
import AdminLayout from './layouts/AdminLayout.jsx';
import ProtectedRoute from './components/common/ProtectedRoute.jsx';
import Spinner from './components/common/Spinner.jsx';

// Core & Shop Pages
const Home = lazy(() => import('./pages/Home.jsx'));
const Shop = lazy(() => import('./pages/Shop.jsx'));
const ListingDetail = lazy(() => import('./pages/ListingDetail.jsx'));
const PetSupplies = lazy(() => import('./pages/PetSupplies.jsx'));
const About = lazy(() => import('./pages/About.jsx'));
const Contact = lazy(() => import('./pages/Contact.jsx'));
const Location = lazy(() => import('./pages/Location.jsx'));

// Cart & Checkout Pages
const Cart = lazy(() => import('./pages/Cart.jsx'));
const Checkout = lazy(() => import('./pages/Checkout.jsx'));
const OrderSuccess = lazy(() => import('./pages/OrderSuccess.jsx'));

// Policy & FAQ Pages
const ShippingPolicy = lazy(() => import('./pages/policies/ShippingPolicy.jsx'));
const ReturnPolicy = lazy(() => import('./pages/policies/ReturnPolicy.jsx'));
const PrivacyPolicy = lazy(() => import('./pages/policies/PrivacyPolicy.jsx'));
const Terms = lazy(() => import('./pages/policies/Terms.jsx'));
const FAQ = lazy(() => import('./pages/policies/FAQ.jsx'));

// Existing Features: Blog & Auth
const Blog = lazy(() => import('./pages/Blog.jsx'));
const BlogDetail = lazy(() => import('./pages/BlogDetail.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));
const Register = lazy(() => import('./pages/Register.jsx'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword.jsx'));
const ResetPassword = lazy(() => import('./pages/ResetPassword.jsx'));
const PostListing = lazy(() => import('./pages/PostListing.jsx'));
const EditListing = lazy(() => import('./pages/EditListing.jsx'));
const MyListings = lazy(() => import('./pages/MyListings.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));

// Admin Pages
const AdminDashboard = lazy(() => import('./pages/AdminDashboard.jsx'));
const AdminOrderList = lazy(() => import('./pages/admin/AdminOrderList.jsx'));
const AdminBlogList = lazy(() => import('./pages/admin/AdminBlogList.jsx'));
const AdminBlogForm = lazy(() => import('./pages/admin/AdminBlogForm.jsx'));
const AdminBlogDetail = lazy(() => import('./pages/admin/AdminBlogDetail.jsx'));
const AdminUserList = lazy(() => import('./pages/admin/AdminUserList.jsx'));
const AdminListingList = lazy(() => import('./pages/admin/AdminListingList.jsx'));
const AdminReportList = lazy(() => import('./pages/admin/AdminReportList.jsx'));
const AdminInquiryList = lazy(() => import('./pages/admin/AdminInquiryList.jsx'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));

function PageLoader() {
  return (
    <div className="flex min-h-[100svh] items-start justify-center pt-[30vh]">
      <Spinner size="lg" label="Loading page" />
    </div>
  );
}

/** Wraps a lazy page in Suspense + optional auth/role guards. */
function GuardedPage({ element, role }) {
  return (
    <ProtectedRoute role={role}>
      <Suspense fallback={<PageLoader />}>{element}</Suspense>
    </ProtectedRoute>
  );
}

/** One canonical URL per product: /shop/:slug permanently lives at /listings/:slug. */
function RedirectToListing() {
  const { slug } = useParams();
  return <Navigate to={`/listings/${slug}`} replace />;
}

/** /listings is the same page as /shop — keep a single indexable URL and preserve filters. */
function RedirectToShop() {
  const { search } = useLocation();
  return <Navigate to={`/shop${search}`} replace />;
}

function LazyPage({ element }) {
  return <Suspense fallback={<PageLoader />}>{element}</Suspense>;
}

export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        {/* 1. Home */}
        <Route index element={<LazyPage element={<Home />} />} />

        {/* 2. About Us */}
        <Route path="about" element={<LazyPage element={<About />} />} />

        {/* 3. Products / Shop (/listings redirects here so only one URL is indexed) */}
        <Route path="shop" element={<LazyPage element={<Shop />} />} />
        <Route path="listings" element={<RedirectToShop />} />

        {/* 4. Product Details — canonical URL is /listings/:slug; /shop/:slug redirects to it */}
        <Route path="shop/:slug" element={<RedirectToListing />} />
        <Route path="listings/:slug" element={<LazyPage element={<ListingDetail />} />} />

        {/* 5. Pet Supplies */}
        <Route path="pet-supplies" element={<LazyPage element={<PetSupplies />} />} />

        {/* 6. Contact Us */}
        <Route path="contact" element={<LazyPage element={<Contact />} />} />

        {/* 7. Location / Visit Us */}
        <Route path="location" element={<LazyPage element={<Location />} />} />

        {/* 8. Cart & Checkout */}
        <Route path="cart" element={<LazyPage element={<Cart />} />} />
        <Route path="checkout" element={<LazyPage element={<Checkout />} />} />
        <Route path="order-success/:orderId" element={<LazyPage element={<OrderSuccess />} />} />

        {/* 9. My Account / Login */}
        <Route path="login" element={<LazyPage element={<Login />} />} />
        <Route path="register" element={<LazyPage element={<Register />} />} />
        <Route path="forgot-password" element={<LazyPage element={<ForgotPassword />} />} />
        <Route path="reset-password/:token" element={<LazyPage element={<ResetPassword />} />} />
        <Route path="profile" element={<GuardedPage element={<Profile />} />} />
        <Route path="account" element={<Navigate to="/profile" replace />} />
        <Route path="settings" element={<Navigate to="/settings/account" replace />} />
        <Route path="settings/:section" element={<GuardedPage element={<Settings />} />} />

        {/* 10. Shipping & Delivery Policy */}
        <Route path="shipping-policy" element={<LazyPage element={<ShippingPolicy />} />} />

        {/* 11. Return / Refund Policy */}
        <Route path="return-policy" element={<LazyPage element={<ReturnPolicy />} />} />

        {/* 12. Privacy Policy */}
        <Route path="privacy-policy" element={<LazyPage element={<PrivacyPolicy />} />} />

        {/* 13. Terms & Conditions */}
        <Route path="terms" element={<LazyPage element={<Terms />} />} />

        {/* 14. FAQ */}
        <Route path="faq" element={<LazyPage element={<FAQ />} />} />

        {/* Blog & Guides (Preserved) */}
        <Route path="blog" element={<LazyPage element={<Blog />} />} />
        <Route path="blog/:slug" element={<LazyPage element={<BlogDetail />} />} />

        {/* Admin-only: listing creation & management */}
        <Route
          path="post-listing"
          element={<GuardedPage role="ADMIN" element={<PostListing />} />}
        />
        <Route
          path="my-listings"
          element={<GuardedPage role="ADMIN" element={<MyListings />} />}
        />
        <Route
          path="my-listings/:id/edit"
          element={<GuardedPage role="ADMIN" element={<EditListing />} />}
        />

        {/* Admin Login — public entry point reusing the shared Login page.
            Must stay OUTSIDE the guarded /admin tree below, otherwise the
            ADMIN guard would redirect unauthenticated visitors to /login. */}
        <Route path="admin/login" element={<LazyPage element={<Login />} />} />

        {/* Admin Portal */}
        <Route
          path="admin"
          element={
            <ProtectedRoute role="ADMIN">
              <Suspense fallback={<PageLoader />}>
                <AdminLayout />
              </Suspense>
            </ProtectedRoute>
          }
        >
          <Route index element={<LazyPage element={<AdminDashboard />} />} />
          <Route path="orders" element={<LazyPage element={<AdminOrderList />} />} />
          <Route path="listings" element={<LazyPage element={<AdminListingList />} />} />
          <Route path="blog" element={<LazyPage element={<AdminBlogList />} />} />
          <Route path="blog/new" element={<LazyPage element={<AdminBlogForm />} />} />     
          <Route path="blog/:id" element={<LazyPage element={<AdminBlogDetail />} />} />
          <Route path="blog/:id/edit" element={<LazyPage element={<AdminBlogForm />} />} />
          <Route path="users" element={<LazyPage element={<AdminUserList />} />} />
          <Route path="reports" element={<LazyPage element={<AdminReportList />} />} />
          <Route path="inquiries" element={<LazyPage element={<AdminInquiryList />} />} />
          <Route path="settings" element={<Navigate to="/admin/settings/account" replace />} />
          <Route path="settings/:section" element={<LazyPage element={<AdminSettings />} />} />
        </Route>

        <Route path="*" element={<LazyPage element={<NotFound />} />} />
      </Route>
    </Routes>
  );
}
