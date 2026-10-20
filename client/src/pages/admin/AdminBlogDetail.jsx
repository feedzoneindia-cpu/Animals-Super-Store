import DOMPurify from 'dompurify';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Button, { buttonStyles } from '../../components/common/Button.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ImageWithFallback from '../../components/common/ImageWithFallback.jsx';
import { BLOG_STATUS_STYLES } from '../../constants/blog.js';
import { useToast } from '../../context/ToastContext.jsx';
import useSEO from '../../hooks/useSEO.js';
import { blogService } from '../../services/blogService.js';
import { formatFullDate, readingTime } from '../../utils/format.js';

/** Admin view of a single blog — works for drafts and archived posts too. */
export default function AdminBlogDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingAction, setPendingAction] = useState(null); // 'publish' | 'unpublish' | 'archive' | 'delete'
  const [actionLoading, setActionLoading] = useState(false);

  useSEO({ title: blog?.title ? `${blog.title} · Admin` : 'Blog Detail', noindex: true });

  const fetchBlog = useCallback(() => {
    setLoading(true);
    setError('');
    blogService
      .adminGetBlog(id)
      .then(setBlog)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchBlog();
  }, [fetchBlog]);

  const confirmAction = async () => {
    if (!pendingAction || !blog) return;
    setActionLoading(true);
    try {
      if (pendingAction === 'publish') {
        setBlog(await blogService.publishBlog(blog._id));
        toast('Blog published.');
      } else if (pendingAction === 'unpublish') {
        setBlog(await blogService.unpublishBlog(blog._id));
        toast('Blog unpublished and moved back to drafts.');
      } else if (pendingAction === 'archive') {
        setBlog(await blogService.archiveBlog(blog._id));
        toast('Blog archived.');
      } else if (pendingAction === 'delete') {
        await blogService.deleteBlog(blog._id);
        toast('Blog deleted.');
        navigate('/admin/blog', { replace: true });
        return;
      }
      setPendingAction(null);
      fetchBlog(); // refresh populated fields (author etc.)
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const dialogConfig = useMemo(
    () =>
      blog
        ? {
            publish: {
              title: 'Publish this blog?',
              message: `"${blog.title}" will go live on the public blog immediately.`,
              confirmLabel: 'Publish',
              danger: false,
            },
            unpublish: {
              title: 'Unpublish this blog?',
              message: `"${blog.title}" will be removed from the public blog and moved back to drafts. Its URL will stop working.`,
              confirmLabel: 'Unpublish',
              danger: false,
            },
            archive: {
              title: 'Archive this blog?',
              message: `"${blog.title}" will be hidden from the public blog and its page will stop being accessible.`,
              confirmLabel: 'Archive',
              danger: false,
            },
            delete: {
              title: 'Delete this blog?',
              message: `"${blog.title}" will be permanently deleted, along with its cover image. This cannot be undone.`,
              confirmLabel: 'Delete Blog',
              danger: true,
            },
          }[pendingAction] ?? null
        : null,
    [blog, pendingAction]
  );

  if (loading && !blog) {
    return (
      <div className="animate-pulse">
        <div className="h-5 w-32 rounded bg-gray-200" />
        <div className="mt-6 h-9 w-3/4 rounded bg-gray-200" />
        <div className="mt-8 aspect-[16/9] max-w-3xl rounded-2xl bg-gray-200" />
        <div className="mt-8 max-w-3xl space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-4 w-full rounded bg-gray-200" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !blog) {
    return (
      <EmptyState
        title="Blog not found"
        message={error || 'This blog may have been deleted.'}
        action={
          <Link to="/admin/blog" className={buttonStyles({ variant: 'primary', size: 'sm' })}>
            Back to Blogs
          </Link>
        }
      />
    );
  }

  const { status, title, category, excerpt, content, coverImage, tags, author, createdAt, updatedAt, publishedAt, slug } = blog;

  const sanitizedContent = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'p', 'strong', 'em', 'u', 's', 'a', 'ul', 'ol', 'li', 'blockquote', 'img', 'br', 'hr', 'code', 'pre', 'span'],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'src', 'alt', 'width', 'height'],
    ALLOW_DATA_ATTR: false,
  });

  return (
    <article className="max-w-3xl">
      <Link to="/admin/blog" className="text-sm font-bold text-brand-700 hover:text-brand-800 bg-gray-100 px-2.5 py-2 rounded-lg inline-flex items-center gap-1 hover:bg-gray-200 transition-colors">
        ← Back to Blogs
      </Link>

      <header className="mt-5">
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span className={`rounded-full px-2.5 py-0.5 font-semibold capitalize ${BLOG_STATUS_STYLES[status]}`}>
            {status}
          </span>
          <span>{category || 'General'}</span>
          <span aria-hidden="true">·</span>
          <span>{readingTime(content)} min read</span>
        </div>
        <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-gray-900">{title}</h1>
        <p className="mt-2 text-sm text-gray-500">
          By <span className="font-medium text-gray-700">{author?.name ?? 'Animals Super Store'}</span>
          {' · '}Created {formatFullDate(createdAt)}
          {status === 'published' && publishedAt ? ` · Published ${formatFullDate(publishedAt)}` : ` · Updated ${formatFullDate(updatedAt)}`}
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link to={`/admin/blog/${blog._id}/edit`} className={buttonStyles({ variant: 'primary', size: 'sm' })}>
            Edit
          </Link>
          {status === 'published' && (
            <Link
              to={`/blog/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonStyles({ variant: 'outline', size: 'sm' })}
            >
              View live ↗
            </Link>
          )}
          {status === 'draft' && (
            <Button variant="secondary" size="sm" onClick={() => setPendingAction('publish')}>
              Publish
            </Button>
          )}
          {status === 'published' && (
            <Button variant="ghost" size="sm" onClick={() => setPendingAction('unpublish')}>
              Unpublish
            </Button>
          )}
          {status !== 'archived' && (
            <Button variant="ghost" size="sm" onClick={() => setPendingAction('archive')}>
              Archive
            </Button>
          )}
          <Button variant="danger" size="sm" onClick={() => setPendingAction('delete')}>
            Delete
          </Button>
        </div>
      </header>

      {coverImage?.url && (
        <ImageWithFallback
          src={coverImage.url}
          alt=""
          className="mt-8 aspect-[16/9] w-full rounded-2xl border border-gray-200 object-cover"
        />
      )}

      {excerpt && <p className="mt-8 text-base italic leading-7 text-gray-600">{excerpt}</p>}

      <div
        className="prose prose-gray mt-8 max-w-none prose-headings:font-bold prose-a:text-brand-700 prose-img:rounded-xl prose-blockquote:border-brand-300 prose-blockquote:text-gray-600"
        // Sanitized above before it reaches the DOM.
        dangerouslySetInnerHTML={{ __html: sanitizedContent }}
      />

      {tags?.length > 0 && (
        <footer className="mt-10 flex flex-wrap gap-2 border-t border-gray-200 pt-6">
          {tags.map((tag) => (
            <span key={tag} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
              #{tag}
            </span>
          ))}
        </footer>
      )}

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
    </article>
  );
}