import { NavLink, Navigate, useParams } from 'react-router-dom';
import {
  AccountForm,
  PasswordForm,
  AppearanceForm,
  DeleteAccountPanel,
} from '../components/settings/SettingsForms.jsx';
import useSEO from '../hooks/useSEO.js';

const SECTIONS = [
  {
    key: 'account',
    label: 'Edit Profile Details',
    title: 'Edit Profile Details',
    description: 'Your name and contact details.',
    render: () => <AccountForm />,
  },
  {
    key: 'password',
    label: 'Password',
    title: 'Change password',
    description: "Use a strong password you don't use elsewhere.",
    render: () => <PasswordForm />,
  },
  {
    key: 'appearance',
    label: 'Appearance',
    title: 'Appearance',
    description: 'Choose how the site looks to you.',
    render: () => <AppearanceForm />,
  },
  {
    key: 'delete',
    label: 'Delete Account',
    title: 'Delete account',
    description: 'Permanently remove your account.',
    render: () => <DeleteAccountPanel />,
    danger: true,
  },
];

const linkClass = (isActive, danger) =>
  `block shrink-0 whitespace-nowrap rounded-lg border px-3.5 py-2 text-sm font-medium transition-all duration-200 lg:border-transparent ${
    isActive
      ? 'border-brand-200 bg-brand-50 text-brand-800 shadow-xs'
      : `border-gray-200 bg-white hover:border-brand-200 hover:bg-brand-50/60 lg:bg-transparent ${
          danger ? 'text-red-600 hover:text-red-700' : 'text-gray-600 hover:text-gray-900'
        }`
  }`;

/** Customer Settings: profile details, password, theme and account deletion. */
export default function Settings() {
  const { section } = useParams();
  const current = SECTIONS.find((item) => item.key === section);
  useSEO({ title: current ? `${current.title} · Settings` : 'Settings', noindex: true });

  if (!current) return <Navigate to="/settings/account" replace />;

  return (
    <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Settings</h1>
      <p className="mt-1 text-sm text-gray-600">Manage your account and preferences.</p>

      <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8">
        <nav
          aria-label="Settings menu"
          className="flex min-w-0 gap-2 overflow-x-auto pb-2 lg:block lg:space-y-1 lg:overflow-visible lg:pb-0"
        >
          <NavLink
            to="/profile"
            className={() => linkClass(false, false)}
          >
            ← My Orders
          </NavLink>
          {SECTIONS.map((item) => (
            <NavLink
              key={item.key}
              to={`/settings/${item.key}`}
              className={({ isActive }) => linkClass(isActive, item.danger)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div key={current.key} className="min-w-0 animate-fade-up space-y-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{current.title}</h2>
            <p className="mt-1 text-sm text-gray-500">{current.description}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            {current.render()}
          </div>
        </div>
      </div>
    </section>
  );
}
