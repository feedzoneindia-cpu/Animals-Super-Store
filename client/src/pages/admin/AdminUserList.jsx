import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Button from '../../components/common/Button.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import Pagination from '../../components/common/Pagination.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { adminService } from '../../services/adminService.js';
import useSEO from '../../hooks/useSEO.js';
import { formatDate } from '../../utils/format.js';

const PAGE_SIZE = 9;

const TABS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'blocked', label: 'Blocked' },
];

const USER_STATUS_STYLES = {
  active: 'bg-brand-50 text-brand-800',
  blocked: 'bg-red-50 text-red-700',
};

const ROLE_STYLES = {
  USER: 'bg-gray-100 text-gray-600',
  ADMIN: 'bg-amber-50 text-amber-700',
};

function DotsIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="5" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="12" cy="19" r="1.7" />
    </svg>
  );
}

/** Three-dot menu (visible on card hover) with the Block / Unblock action. */
function UserMenu({ user, isSelf, busy, open, onOpenChange, onBlock, onUnblock }) {
  const wrapRef = useRef(null);
  const blocked = user.status === 'blocked';

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) onOpenChange(false);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onOpenChange]);

  return (
    <div
      ref={wrapRef}
      className={`absolute right-3 top-3 z-20 transition-opacity duration-200 [@media(hover:none)]:opacity-100 ${
        open ? 'opacity-100' : 'opacity-0 focus-within:opacity-100 group-hover:opacity-100'
      }`}
    >
      <button
        type="button"
        aria-label={`Actions for ${user.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-gray-700 shadow-sm transition-colors hover:bg-brand-50 hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
      >
        <DotsIcon />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-40 origin-top-right animate-scale-in rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg"
        >
          {blocked ? (
            <button
              type="button"
              role="menuitem"
              disabled={busy}
              className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-brand-50 hover:text-brand-800 focus-visible:outline-none disabled:opacity-50"
              onClick={() => {
                onOpenChange(false);
                onUnblock(user);
              }}
            >
              Unblock
            </button>
          ) : (
            <button
              type="button"
              role="menuitem"
              disabled={busy || isSelf}
              className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none disabled:opacity-50"
              onClick={() => {
                onOpenChange(false);
                onBlock(user);
              }}
            >
              Block
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function UserCard({ user, isSelf, onBlock, onUnblock, busyId, menuOpen, onMenuOpenChange }) {
  const busy = busyId === user.id;
  const blocked = user.status === 'blocked';
  const initial = user.name?.charAt(0).toUpperCase() ?? '?';

  return (
    <li
      className={`group card-lift relative flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-xs ${
        menuOpen ? 'z-30' : 'z-0'
      } ${blocked ? 'opacity-90' : ''}`}
    >
      <div className="flex items-start gap-4 pr-10">
        <span
          aria-hidden="true"
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-semibold ${
            blocked ? 'bg-red-50 text-red-700' : 'bg-brand-700 text-brand-200'
          }`}
        >
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-gray-900">
            {user.name}
            {isSelf && <span className="ml-2 text-xs font-normal text-gray-500">(you)</span>}
          </p>
          <p className="truncate text-sm text-gray-500">{user.email}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${USER_STATUS_STYLES[user.status]}`}>
          {user.status}
        </span>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ROLE_STYLES[user.role]}`}>
          {user.role}
        </span>
      </div>

      <dl className="mt-4 space-y-1.5 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-gray-500">Phone</dt>
          <dd className="truncate font-medium text-gray-700">{user.phone || '—'}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-gray-500">Joined</dt>
          <dd className="font-medium text-gray-700">{formatDate(user.createdAt)}</dd>
        </div>
      </dl>

      <UserMenu
        user={user}
        isSelf={isSelf}
        busy={busy}
        open={menuOpen}
        onOpenChange={onMenuOpenChange}
        onBlock={onBlock}
        onUnblock={onUnblock}
      />
    </li>
  );
}

export default function AdminUserList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') ?? '';
  // Default view is Active users; "all" is an explicit choice kept in the URL.
  const status = searchParams.get('status') || 'active';
  const page = Number(searchParams.get('page')) || 1;
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  useSEO({ title: 'Manage Users', noindex: true });

  const [result, setResult] = useState({ users: [], pagination: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [pendingBlock, setPendingBlock] = useState(null); // user about to be blocked
  const [actionLoading, setActionLoading] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [searchTerm, setSearchTerm] = useState(q);

  // Live search: update the URL (and so the list) shortly after each keystroke.
  useEffect(() => {
    const trimmed = searchTerm.trim();
    if (trimmed === q) return undefined;
    const timer = setTimeout(() => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (trimmed) next.set('q', trimmed);
          else next.delete('q');
          next.delete('page');
          return next;
        },
        { replace: true }
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, q, setSearchParams]);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    setError('');
    // Admin accounts are never listed — only regular users are managed here.
    const params = { page, limit: PAGE_SIZE, role: 'USER' };
    if (q) params.q = q;
    if (status !== 'all') params.status = status;
    adminService
      .getUsers(params)
      .then((data) => setResult(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [q, status, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const applyParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    setSearchParams(next);
  };

  const handlePageChange = (nextPage) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(nextPage));
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const confirmBlock = async () => {
    if (!pendingBlock) return;
    setActionLoading(true);
    setBusyId(pendingBlock.id);
    try {
      await adminService.blockUser(pendingBlock.id);
      toast('User blocked. They are signed out of the site immediately.');
      setPendingBlock(null);
      fetchUsers();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setActionLoading(false);
      setBusyId(null);
    }
  };

  const handleUnblock = async (user) => {
    setBusyId(user.id);
    try {
      await adminService.unblockUser(user.id);
      toast('User unblocked.');
      fetchUsers();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Users</h1>
        <p className="mt-1 text-sm text-gray-600">
          Search accounts and block or unblock users. Blocked users are locked out immediately.
        </p>
      </div>

      {/* Status tabs (underline on the current tab) */}
      <div className="mt-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b border-gray-200">
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="User status">
        {TABS.map((tab) => {
          const active = status === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => applyParam('status', tab.value)}
              className={`-mb-px shrink-0 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 ${
                active
                  ? 'border-brand-700 text-brand-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
        </div>

        {/* Search, on the right of the tabs */}
        <div className="flex w-full pb-2 sm:w-72" role="search">
        <label htmlFor="user-search" className="sr-only">
          Search users
        </label>
        <input
          id="user-search"
          type="search"
          name="q"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search by name or email"
          className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-700/20"
        />
        </div>
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="flex min-h-[30vh] items-center justify-center">
            <Spinner size="lg" label="Loading users" />
          </div>
        ) : error ? (
          <EmptyState
            title="Something went wrong"
            message={error}
            action={
              <Button variant="primary" size="sm" onClick={fetchUsers}>
                Try Again
              </Button>
            }
          />
        ) : result.users.length === 0 ? (
          <EmptyState
            title={q ? 'No matching users' : 'No users yet'}
            message={q ? 'No users match your search. Try a different term.' : 'User accounts will appear here as people sign up.'}
          />
        ) : (
          <>
            <ul className="stagger grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {result.users.map((user) => (
                <UserCard
                  key={user.id}
                  user={user}
                  isSelf={currentUser?.id === user.id}
                  onBlock={setPendingBlock}
                  onUnblock={handleUnblock}
                  busyId={busyId}
                  menuOpen={openMenuId === user.id}
                  onMenuOpenChange={(next) => setOpenMenuId(next ? user.id : null)}
                />
              ))}
            </ul>
            <Pagination
              className="mt-10"
              page={result.pagination.page}
              totalPages={result.pagination.totalPages}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(pendingBlock)}
        title="Block this user?"
        message={
          pendingBlock
            ? `${pendingBlock.name} (${pendingBlock.email}) will be signed out immediately and unable to sign in, post listings, or report listings until unblocked.`
            : ''
        }
        confirmLabel="Block User"
        danger
        loading={actionLoading}
        onConfirm={confirmBlock}
        onCancel={() => setPendingBlock(null)}
      />
    </section>
  );
}