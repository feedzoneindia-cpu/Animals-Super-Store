import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Button, { buttonStyles } from '../../components/common/Button.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import Pagination from '../../components/common/Pagination.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import ImageWithFallback from '../../components/common/ImageWithFallback.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { blogService } from '../../services/blogService.js';
import useSEO from '../../hooks/useSEO.js';
import { formatDate } from '../../utils/format.js';
import { BLOG_STATUS_STYLES } from '../../constants/blog.js';

const TABS = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Drafts' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
];

const PAGE_SIZE = 9;

function DotsIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="5" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="12" cy="19" r="1.7" />
    </svg>
  );
}

const MENU_ITEM =
  'flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-brand-50 hover:text-brand-800 focus-visible:bg-brand-50 focus-visible:outline-none disabled:opacity-50';

/** Three-dot dropdown holding every action for a blog. */
function BlogActionsMenu({ blog, open, onOpenChange, onAction, busy }) {
  const wrapRef = useRef(null);
  const { _id, title, slug, status } = blog;

  // Close on outside click / Escape while open.
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

  const run = (type) => {
    onOpenChange(false);
    onAction(type, blog);
  };

  return (
    <div
      ref={wrapRef}
      className={`absolute right-3 top-3 z-20 transition-opacity duration-200 [@media(hover:none)]:opacity-100 ${
        open ? 'opacity-100' : 'opacity-0 focus-within:opacity-100 group-hover:opacity-100'
      }`}
    >
      <button
        type="button"
        aria-label={`Actions for ${title}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-gray-700 shadow-sm backdrop-blur transition-colors hover:bg-brand-50 hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
      >
        <DotsIcon />
      </button>

      {open && (
        <div
          role="menu"
          aria-label={`Actions for ${title}`}
          className="absolute right-0 top-full mt-2 w-44 origin-top-right animate-scale-in rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg"
        >
          <Link to={`/admin/blog/${_id}/edit`} role="menuitem" className={MENU_ITEM} onClick={() => onOpenChange(false)}>
            Edit
          </Link>
          {status === 'published' && (
            <Link
              to={`/blog/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              role="menuitem"
              className={MENU_ITEM}
              onClick={() => onOpenChange(false)}
            >
              View live ↗
            </Link>
          )}
          {status === 'draft' && (
            <button type="button" role="menuitem" disabled={busy} className={MENU_ITEM} onClick={() => run('publish')}>
              Publish
            </button>
          )}
          {status === 'published' && (
            <button type="button" role="menuitem" disabled={busy} className={MENU_ITEM} onClick={() => run('unpublish')}>
              Unpublish
            </button>
          )}
          {status !== 'archived' && (
            <button type="button" role="menuitem" disabled={busy} className={MENU_ITEM} onClick={() => run('archive')}>
              Archive
            </button>
          )}
          <div className="my-1 border-t border-gray-200" role="separator" />
          <button
            type="button"
            role="menuitem"
            disabled={busy}
            className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 focus-visible:bg-red-50 focus-visible:outline-none disabled:opacity-50"
            onClick={() => run('delete')}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

/** A single blog card. The whole card opens the blog detail page. */
function AdminBlogCard({ blog, onAction, busyId, menuOpen, onMenuOpenChange }) {
  const busy = busyId === blog._id;
  const { _id, title, excerpt, category, status, createdAt, updatedAt, publishedAt, coverImage } = blog;

  return (
    <li
      className={`group card-lift relative flex flex-col rounded-2xl border border-gray-200 bg-white shadow-xs focus-within:ring-2 focus-within:ring-brand-700/30 ${
        menuOpen ? 'z-30' : 'z-0'
      } ${busy ? 'opacity-70' : ''}`}
    >
      <div className="relative aspect-[16/9] overflow-hidden rounded-t-2xl bg-gray-100">
        <ImageWithFallback
          src={coverImage?.url}
          optimize={800}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />
        <span
          className={`absolute left-3 top-3 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize shadow-xs ${BLOG_STATUS_STYLES[status]}`}
        >
          {status}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <span className="text-xs font-medium text-gray-500">{category || 'General'}</span>
        <h3 className="mt-1.5 line-clamp-2 text-lg font-semibold leading-snug text-gray-900 group-hover:text-brand-700">
          {/* Stretched link: makes the entire card clickable. */}
          <Link
            to={`/admin/blog/${_id}`}
            className="after:absolute after:inset-0 after:z-10 after:rounded-2xl focus-visible:outline-none"
          >
            {title}
          </Link>
        </h3>
        {excerpt && <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-600">{excerpt}</p>}
        <p className="mt-auto pt-4 text-xs text-gray-500">
          Created {formatDate(createdAt)}
          {status === 'published' && publishedAt ? ` · Published ${formatDate(publishedAt)}` : ` · Updated ${formatDate(updatedAt)}`}
        </p>
      </div>

      <BlogActionsMenu blog={blog} open={menuOpen} onOpenChange={onMenuOpenChange} onAction={onAction} busy={busy} />
    </li>
  );
}

export default function AdminBlogList() {
  const [searchParams, setSearchParams] = useSearchParams();
  // Default view is Published; "all" is an explicit choice kept in the URL.
  const status = searchParams.get('status') || 'published';
  const q = searchParams.get('q') ?? '';
  const page = Number(searchParams.get('page')) || 1;
  const { toast } = useToast();

  useSEO({ title: 'Manage Blogs', noindex: true });

  const [result, setResult] = useState({ blogs: [], pagination: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [pendingAction, setPendingAction] = useState(null); // { type, blog }
  const [actionLoading, setActionLoading] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);

  const fetchBlogs = useCallback(() => {
    setLoading(true);
    setError('');
    const params = { page, limit: PAGE_SIZE };
    if (status !== 'all') params.status = status;
    if (q) params.q = q;
    blogService
      .adminGetBlogs(params)
      .then((data) => setResult(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [status, q, page]);

  useEffect(() => {
    fetchBlogs();
  }, [fetchBlogs]);

  const switchTab = (nextStatus) => {
    const next = new URLSearchParams(searchParams);
    next.set('status', nextStatus);
    next.delete('page');
    setSearchParams(next);
  };

  const handleSearch = (event) => {
    event.preventDefault();
    const next = new URLSearchParams(searchParams);
    if (event.target.elements.q.value) next.set('q', event.target.elements.q.value);
    else next.delete('q');
    next.delete('page');
    setSearchParams(next);
  };

  const handlePageChange = (nextPage) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(nextPage));
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const confirmAction = async () => {
    if (!pendingAction) return;
    const { type, blog } = pendingAction;
    setActionLoading(true);
    setBusyId(blog._id);
    try {
      if (type === 'publish') {
        await blogService.publishBlog(blog._id);
        toast('Blog published.');
      } else if (type === 'unpublish') {
        await blogService.unpublishBlog(blog._id);
        toast('Blog unpublished and moved back to drafts.');
      } else if (type === 'archive') {
        await blogService.archiveBlog(blog._id);
        toast('Blog archived.');
      } else if (type === 'delete') {
        await blogService.deleteBlog(blog._id);
        toast('Blog deleted.');
      }
      setPendingAction(null);
      if (type === 'delete' && result.blogs.length === 1 && page > 1) {
        const next = new URLSearchParams(searchParams);
        next.set('page', String(page - 1));
        setSearchParams(next);
      } else {
        fetchBlogs();
      }
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setActionLoading(false);
      setBusyId(null);
    }
  };

  const dialogConfig = useMemo(
    () =>
      pendingAction
        ? {
            publish: {
              title: 'Publish this blog?',
              message: `"${pendingAction.blog.title}" will go live on the public blog immediately.`,
              confirmLabel: 'Publish',
              danger: false,
            },
            unpublish: {
              title: 'Unpublish this blog?',
              message: `"${pendingAction.blog.title}" will be removed from the public blog and moved back to drafts. Its URL will stop working.`,
              confirmLabel: 'Unpublish',
              danger: false,
            },
            archive: {
              title: 'Archive this blog?',
              message: `"${pendingAction.blog.title}" will be hidden from the public blog and its page will stop being accessible.`,
              confirmLabel: 'Archive',
              danger: false,
            },
            delete: {
              title: 'Delete this blog?',
              message: `"${pendingAction.blog.title}" will be permanently deleted, along with its cover image. This cannot be undone.`,
              confirmLabel: 'Delete Blog',
              danger: true,
            },
          }[pendingAction.type]
        : null,
    [pendingAction]
  );

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Blogs</h1>
          <p className="mt-1 text-sm text-gray-600">Write, publish, and manage blog articles.</p>
        </div>
        <Link to="/admin/blog/new" className={buttonStyles({ size: 'sm' })}>
          + New Blog
        </Link>
      </div>

      {/* Status tabs */}
      <div className="mt-6 flex flex-wrap gap-1 border-b border-gray-200" role="tablist" aria-label="Blog status">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={status === tab.value}
            onClick={() => switchTab(tab.value)}
            className={`-mb-px shrink-0 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 ${
              status === tab.value
                ? 'border-brand-700 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <form className="mt-4 flex max-w-md gap-2" role="search" onSubmit={handleSearch}>
        <label htmlFor="admin-blog-search" className="sr-only">
          Search blogs
        </label>
        <input
          id="admin-blog-search"
          type="search"
          name="q"
          defaultValue={q}
          key={q}
          placeholder="Search by title"
          className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-700/20"
        />
        <Button type="submit" variant="outline" size="sm">
          Search
        </Button>
      </form>

      <div className="mt-6">
        {loading ? (
          <div className="flex min-h-[30vh] items-center justify-center">
            <Spinner size="lg" label="Loading blogs" />
          </div>
        ) : error ? (
          <EmptyState
            title="Something went wrong"
            message={error}
            action={
              <Button variant="primary" size="sm" onClick={fetchBlogs}>
                Try Again
              </Button>
            }
          />
        ) : result.blogs.length === 0 ? (
          <EmptyState
            title={q ? 'No matching blogs' : 'No blogs yet'}
            message={q ? 'No blogs match your search. Try a different term.' : 'Write your first article to get the blog started.'}
            action={
              !q ? (
                <Link to="/admin/blog/new" className="text-sm font-semibold text-brand-700 hover:text-brand-800">
                  Create a blog
                </Link>
              ) : undefined
            }
          />
        ) : (
          <>
            <ul className="stagger grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {result.blogs.map((blog) => (
                <AdminBlogCard
                  key={blog._id}
                  blog={blog}
                  onAction={(type, b) => setPendingAction({ type, blog: b })}
                  busyId={busyId}
                  menuOpen={openMenuId === blog._id}
                  onMenuOpenChange={(next) => setOpenMenuId(next ? blog._id : null)}
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
        open={Boolean(pendingAction)}
        title={dialogConfig?.title}
        message={dialogConfig?.message}
        confirmLabel={dialogConfig?.confirmLabel}
        danger={dialogConfig?.danger}
        loading={actionLoading}
        onConfirm={confirmAction}
        onCancel={() => setPendingAction(null)}
      />
    </section>
  );
}