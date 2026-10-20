import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';

const ADMIN_LINKS = [
  { label: 'Dashboard', to: '/admin', end: true },
  { label: 'Inquiries', to: '/admin/inquiries' },
  { label: 'Orders', to: '/admin/orders' },
  { label: 'Listings', to: '/admin/listings' },
  { label: 'Post a Listing', to: '/post-listing' },
  { label: 'Blogs', to: '/admin/blog' },
  { label: 'Users', to: '/admin/users' },
  { label: 'Reports', to: '/admin/reports' },
];

const SETTINGS_BASE = '/admin/settings';
const SETTINGS_LINKS = [
  { label: 'Account', to: `${SETTINGS_BASE}/account` },
  { label: 'Password', to: `${SETTINGS_BASE}/password` },
  { label: 'Appearance', to: `${SETTINGS_BASE}/appearance` },
  { label: 'Shipping & Orders', to: `${SETTINGS_BASE}/store` },
  { label: 'Delete Account', to: `${SETTINGS_BASE}/delete`, danger: true },
];

const LINK_BASE =
  'block shrink-0 whitespace-nowrap rounded-lg border px-3.5 py-2 text-sm font-medium transition-all duration-200 lg:border-transparent';
const linkClass = (isActive, danger = false) =>
  `${LINK_BASE} ${
    isActive
      ? 'border-brand-200 bg-brand-50 text-brand-800 shadow-xs lg:translate-x-0.5'
      : `border-gray-200 bg-white hover:border-brand-200 hover:bg-brand-50/60 lg:bg-transparent ${
          danger ? 'text-red-600 hover:text-red-700' : 'text-gray-600 hover:text-gray-900'
        }`
  }`;

/** "Settings" entry that expands into its sub-pages (account, password, theme…). */
function SettingsMenu() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const inSettings = pathname.startsWith(SETTINGS_BASE);
  const [open, setOpen] = useState(inSettings);

  // Opening any settings page (deep link, redirect) keeps the group expanded.
  useEffect(() => {
    if (inSettings) setOpen(true);
  }, [inSettings]);

  const handleToggle = () => {
    if (!inSettings) {
      setOpen(true);
      navigate(SETTINGS_LINKS[0].to);
    } else {
      setOpen((value) => !value);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={open}
        aria-controls="admin-settings-menu"
        className={`${linkClass(inSettings && !open)} flex items-center justify-between gap-2 text-left lg:w-full ${
          inSettings ? 'text-brand-800' : ''
        }`}
      >
        <span>Settings</span>
        <svg
          className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="2"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {open && (
        <div
          id="admin-settings-menu"
          className="flex animate-fade-in gap-2 lg:ml-3 lg:block lg:space-y-1 lg:border-l lg:border-gray-200 lg:pl-2"
        >
          {SETTINGS_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => linkClass(isActive, link.danger)}
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      )}
    </>
  );
}

/**
 * Sidebar layout for admin pages. Rendered inside MainLayout (navbar/footer
 * stay), with each link and page individually reachable only by admins —
 * the /admin route tree is wrapped in a role guard in App.jsx.
 */
export default function AdminLayout() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-8">
        <aside aria-label="Admin menu" className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Admin Panel
          </p>
          <nav className="mt-3 flex gap-2 overflow-x-auto pb-2 lg:block lg:space-y-1 lg:overflow-visible lg:pb-0">
            {ADMIN_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) => linkClass(isActive)}
              >
                {link.label}
              </NavLink>
            ))}
            <SettingsMenu />
          </nav>
        </aside>
        <div className="min-w-0 animate-fade-up">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
