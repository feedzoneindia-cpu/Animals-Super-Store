import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { PUBLIC_NAV } from '../../constants/navigation.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { useScrollSpy } from '../../context/ScrollSpyContext.jsx';
import { buttonStyles } from '../common/Button.jsx';
import Logo from '../common/Logo.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const { activeSection } = useScrollSpy();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const adminDropdownRef = useRef(null);

  const isHome = location.pathname === '/';

  // Close menus with Escape.
  useEffect(() => {
    if (!menuOpen && !adminMenuOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        setAdminMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen, adminMenuOpen]);

  // Close admin menu on outside click
  useEffect(() => {
    if (!adminMenuOpen) return undefined;
    const handleOutsideClick = (event) => {
      if (adminDropdownRef.current && !adminDropdownRef.current.contains(event.target)) {
        setAdminMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [adminMenuOpen]);

  // Close menus on route change
  useEffect(() => {
    setMenuOpen(false);
    setAdminMenuOpen(false);
  }, [location.pathname]);

  const isAdmin = user?.role === 'ADMIN';

  // Admin dropdown items highlight from the current route (not hard-coded).
  const isAdminLinkActive = (to) =>
    to === '/admin' ? location.pathname === '/admin' : location.pathname === to || location.pathname.startsWith(`${to}/`);
  const adminLinkClass = (to, mobile = false) =>
    [
      mobile ? 'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-semibold' : 'flex items-center gap-2 px-3 py-2 text-xs font-semibold',
      isAdminLinkActive(to) ? 'bg-brand-100 text-brand-800' : 'text-gray-700 hover:bg-gray-50 hover:text-brand-800',
    ].join(' ');

  // Active state calculation: On homepage, section scroll-spy dictates active item; elsewhere route path matching decides.
  const isItemActive = (item) => {
    const path = location.pathname;

    if (isHome) {
      if (item.section) {
        return activeSection === item.section;
      }
      // Items with no homepage section (Cart) never highlight while scrolling.
      return false;
    }

    if (item.to === '/') {
      return path === '/';
    }
    if (item.to === '/shop') {
      return path.startsWith('/shop') || path.startsWith('/listings');
    }
    if (item.to === '/blog') {
      return path.startsWith('/blog');
    }
    if (item.to === '/pet-supplies') {
      return path.startsWith('/pet-supplies');
    }
    if (item.to === '/about') {
      return path.startsWith('/about');
    }
    if (item.to === '/contact') {
      return path.startsWith('/contact') || path.startsWith('/location');
    }
    if (item.isCart) {
      return path.startsWith('/cart') || path.startsWith('/checkout');
    }
    return path === item.to;
  };

  const navLinkClass = (isActive) =>
    `inline-flex items-center whitespace-nowrap rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-200 ${
      isActive
        ? 'bg-brand-50 text-brand-700 font-semibold'
        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
    }`;

  const mobileLinkClass = (isActive) =>
    `flex min-h-11 items-center justify-between rounded-lg px-3 py-2.5 text-base font-medium transition-colors ${
      isActive
        ? 'bg-brand-50 text-brand-700 font-semibold'
        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
    }`;

  const handleLinkClick = () => {
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      setMenuOpen(false);
      navigate('/');
    } finally {
      setLoggingOut(false);
    }
  };

  const initial = user?.name?.charAt(0).toUpperCase() ?? '?';

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200/80 bg-white/95">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link
          to="/"
          onClick={handleLinkClick}
          aria-label="Animals Super Store — Home"
          className="flex-shrink-0"
        >
          <Logo />
        </Link>

        {/* Desktop Navigation: Home, Shop, Pet Supplies, Blog, About Us, Contact Us, Cart */}
        <nav
          className="hidden min-w-0 items-center justify-center gap-1 xl:gap-1.5 lg:flex"
          aria-label="Main navigation"
        >
          {PUBLIC_NAV.map((item) => {
            const active = isItemActive(item);

            return (
              <Link
                key={item.label}
                to={item.to}
                onClick={handleLinkClick}
                className={navLinkClass(active)}
              >
                <span>{item.label}</span>
                {item.isCart && itemCount > 0 && (
                  <span className="ml-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-700 text-[10px] font-bold text-white">
                    {itemCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right Desktop Utilities: Admin Portal / Logout */}
        <div className="hidden flex-shrink-0 items-center justify-end gap-2 lg:flex">
          {isAdmin ? (
            <div className="relative flex items-center gap-2" ref={adminDropdownRef}>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAdminMenuOpen((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-800 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-700"
                  aria-expanded={adminMenuOpen}
                  aria-haspopup="true"
                >
                  <span>⚙ Admin Controls</span>
                  <svg
                    className={`h-3.5 w-3.5 transition-transform duration-200 ${
                      adminMenuOpen ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>

                {adminMenuOpen && (
                  <div className="animate-scale-in absolute right-0 mt-2 w-52 origin-top-right rounded-2xl border border-gray-200 bg-white py-1.5 shadow-lg ring-1 ring-black/5 z-50">
                    <div className="border-b border-gray-100 px-3 py-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        Admin Workspace
                      </p>
                    </div>
                    <Link
                      to="/admin"
                      onClick={() => {
                        setAdminMenuOpen(false);
                        handleLinkClick();
                      }}
                      className={adminLinkClass("/admin")}
                    >
                      <span>📊</span>
                      <span>Admin Dashboard</span>
                    </Link>
                    <Link
                      to="/post-listing"
                      onClick={() => {
                        setAdminMenuOpen(false);
                        handleLinkClick();
                      }}
                      className={adminLinkClass("/post-listing")}
                    >
                      <span>➕</span>
                      <span>Post a Listing</span>
                    </Link>
                    <Link
                      to="/admin/listings"
                      onClick={() => {
                        setAdminMenuOpen(false);
                        handleLinkClick();
                      }}
                      className={adminLinkClass("/admin/listings")}
                    >
                      <span>📋</span>
                      <span>Manage Listings</span>
                    </Link>
                    <Link
                      to="/admin/inquiries"
                      onClick={() => {
                        setAdminMenuOpen(false);
                        handleLinkClick();
                      }}
                      className={adminLinkClass("/admin/inquiries")}
                    >
                      <span>💬</span>
                      <span>Manage Inquiries</span>
                    </Link>
                    <Link
                      to="/admin/orders"
                      onClick={() => {
                        setAdminMenuOpen(false);
                        handleLinkClick();
                      }}
                      className={adminLinkClass("/admin/orders")}
                    >
                      <span>📦</span>
                      <span>Manage Orders</span>
                    </Link>
                    <Link
                      to="/admin/blog"
                      onClick={() => {
                        setAdminMenuOpen(false);
                        handleLinkClick();
                      }}
                      className={adminLinkClass("/admin/blog")}
                    >
                      <span>📝</span>
                      <span>Manage Blog</span>
                    </Link>
                    <Link
                      to="/admin/users"
                      onClick={() => {
                        setAdminMenuOpen(false);
                        handleLinkClick();
                      }}
                      className={adminLinkClass("/admin/users")}
                    >
                      <span>👥</span>
                      <span>Manage Users</span>
                    </Link>
                    <Link
                      to="/admin/reports"
                      onClick={() => {
                        setAdminMenuOpen(false);
                        handleLinkClick();
                      }}
                      className={adminLinkClass("/admin/reports")}
                    >
                      <span>🚩</span>
                      <span>Reports</span>
                    </Link>
                    <Link
                      to="/admin/settings/account"
                      onClick={() => {
                        setAdminMenuOpen(false);
                        handleLinkClick();
                      }}
                      className={adminLinkClass("/admin/settings")}
                    >
                      <span>⚙️</span>
                      <span>Settings</span>
                    </Link>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className={buttonStyles({ variant: 'outline', size: 'sm' })}
              >
                {loggingOut ? '…' : 'Logout'}
              </button>
            </div>
          ) : user ? (
            <div className="flex items-center gap-2">
              <Link
                to="/profile"
                onClick={handleLinkClick}
                className="flex items-center gap-1.5 rounded-full border border-gray-200 py-1 pl-1 pr-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-700 text-[10px] font-bold text-white">
                  {initial}
                </span>
                <span className="max-w-[6rem] truncate">{user.name.split(' ')[0]}</span>
              </Link>
              <Link
                to="/settings/account"
                onClick={handleLinkClick}
                className={buttonStyles({ variant: 'outline', size: 'sm' })}
              >
                ⚙️ Settings
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className={buttonStyles({ variant: 'outline', size: 'sm' })}
              >
                {loggingOut ? '…' : 'Logout'}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                onClick={handleLinkClick}
                className={buttonStyles({ variant: 'outline', size: 'sm' })}
              >
                Login
              </Link>
              <Link
                to="/register"
                onClick={handleLinkClick}
                className={buttonStyles({ variant: 'primary', size: 'sm' })}
              >
                Register
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu toggle button */}
        <div className="flex items-center gap-2 lg:hidden">
          <Link
            to="/cart"
            onClick={handleLinkClick}
            className="relative p-2 text-gray-600 hover:text-brand-700"
            aria-label={`Shopping cart with ${itemCount} items`}
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
              />
            </svg>
            {itemCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-700 text-[10px] font-bold text-white">
                {itemCount}
              </span>
            )}
          </Link>

          <button
            type="button"
            className="rounded-md p-2 text-gray-600 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              aria-hidden="true"
            >
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile navigation menu */}
      {menuOpen && (
        <nav
          id="mobile-menu"
          className="animate-slide-down max-h-[calc(100vh-4rem)] overflow-y-auto border-t border-gray-200 bg-white px-4 pb-4 pt-2 shadow-lg lg:hidden"
          aria-label="Mobile navigation"
        >
          <ul className="flex flex-col gap-1">
            {PUBLIC_NAV.map((item) => {
              const active = isItemActive(item);

              return (
                <li key={item.label}>
                  <Link
                    to={item.to}
                    onClick={handleLinkClick}
                    className={mobileLinkClass(active)}
                  >
                    <span>{item.label}</span>
                    {item.isCart && itemCount > 0 && (
                      <span className="rounded-full bg-brand-700 px-2 py-0.5 text-xs font-bold text-white">
                        {itemCount}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Admin Navigation if Admin */}
          {isAdmin && (
            <div className="mt-3 border-t border-gray-100 pt-3">
              <div className="px-3 pb-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-brand-900">
                  ⚙ Admin Management
                </p>
              </div>
              <ul className="flex flex-col gap-0.5">
                <li>
                  <Link
                    to="/admin"
                    onClick={handleLinkClick}
                    className={adminLinkClass("/admin", true)}
                  >
                    <span>📊</span>
                    <span>Admin Dashboard</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/post-listing"
                    onClick={handleLinkClick}
                    className={adminLinkClass("/post-listing", true)}
                  >
                    <span>➕</span>
                    <span>Post a Listing</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/admin/listings"
                    onClick={handleLinkClick}
                    className={adminLinkClass("/admin/listings", true)}
                  >
                    <span>📋</span>
                    <span>Manage Listings</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/admin/inquiries"
                    onClick={handleLinkClick}
                    className={adminLinkClass("/admin/inquiries", true)}
                  >
                    <span>💬</span>
                    <span>Manage Inquiries</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/admin/orders"
                    onClick={handleLinkClick}
                    className={adminLinkClass("/admin/orders", true)}
                  >
                    <span>📦</span>
                    <span>Manage Orders</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/admin/blog"
                    onClick={handleLinkClick}
                    className={adminLinkClass("/admin/blog", true)}
                  >
                    <span>📝</span>
                    <span>Manage Blog</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/admin/users"
                    onClick={handleLinkClick}
                    className={adminLinkClass("/admin/users", true)}
                  >
                    <span>👥</span>
                    <span>Manage Users</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/admin/reports"
                    onClick={handleLinkClick}
                    className={adminLinkClass("/admin/reports", true)}
                  >
                    <span>🚩</span>
                    <span>Reports</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/admin/settings/account"
                    onClick={handleLinkClick}
                    className={adminLinkClass("/admin/settings", true)}
                  >
                    <span>⚙️</span>
                    <span>Settings</span>
                  </Link>
                </li>
              </ul>
            </div>
          )}

          {/* Login / Register for visitors */}
          {!user && (
            <div className="mt-3 flex gap-2 border-t border-gray-100 pt-3">
              <Link
                to="/login"
                onClick={handleLinkClick}
                className={`${buttonStyles({ variant: 'outline', size: 'md' })} flex-1`}
              >
                Login
              </Link>
              <Link
                to="/register"
                onClick={handleLinkClick}
                className={`${buttonStyles({ variant: 'primary', size: 'md' })} flex-1`}
              >
                Register
              </Link>
            </div>
          )}

          {/* User Account / Logout */}
          {user && (
            <div className="mt-3 border-t border-gray-100 pt-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-700 text-xs font-bold text-white">
                    {initial}
                  </span>
                  <span className="text-sm font-semibold text-gray-800">{user.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    to="/settings/account"
                    onClick={handleLinkClick}
                    className={buttonStyles({ variant: 'outline', size: 'sm' })}
                  >
                    ⚙️ Settings
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className={buttonStyles({ variant: 'outline', size: 'sm' })}
                >
                    {loggingOut ? 'Logging out…' : 'Logout'}
                </button>
                </div>
              </div>
            </div>
          )}
        </nav>
      )}
    </header>
  );
}
