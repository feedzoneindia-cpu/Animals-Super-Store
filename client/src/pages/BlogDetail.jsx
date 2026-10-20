import DOMPurify from 'dompurify';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { buttonStyles } from '../components/common/Button.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import ImageWithFallback from '../components/common/ImageWithFallback.jsx';
import useSEO from '../hooks/useSEO.js';
import { blogService } from '../services/blogService.js';
import { formatFullDate, readingTime } from '../utils/format.js';
import { articleSchema, breadcrumbSchema } from '../utils/seoSchema.js';

export default function BlogDetail() {
  const { slug } = useParams();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [suggested, setSuggested] = useState([]);

  useSEO({
    title: blog?.title ?? 'Article',
    description: blog?.excerpt,
    image: blog?.coverImage?.url,
    type: 'article',
    jsonLd: blog
      ? [
          articleSchema(blog),
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Blog', path: '/blog' },
            { name: blog.title, path: `/blog/${blog.slug}` },
          ]),
        ]
      : undefined,
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    blogService
      .getBlogBySlug(slug)
      .then((data) => {
        if (!cancelled) setBlog(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // Suggested reading: other published posts, same category first.
  useEffect(() => {
    let cancelled = false;
    setSuggested([]);
    blogService
      .getBlogs({ page: 1, limit: 12 })
      .then((data) => {
        if (cancelled) return;
        const others = (data?.blogs ?? data?.items ?? []).filter((item) => item.slug !== slug);
        const sameCategory = (item) => (blog?.category && item.category === blog.category ? 0 : 1);
        setSuggested([...others].sort((a, b) => sameCategory(a) - sameCategory(b)).slice(0, 5));
      })
      .catch(() => {
        /* Suggestions are optional — the article still renders without them. */
      });
    return () => {
      cancelled = true;
    };
  }, [slug, blog?.category]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl animate-pulse px-4 py-16 sm:px-6">
        <div className="h-10 w-3/4 rounded bg-gray-200" />
        <div className="mt-4 h-4 w-1/3 rounded bg-gray-200" />
        <div className="mt-8 aspect-[16/9] rounded-xl bg-gray-200" />
        <div className="mt-8 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-4 w-full rounded bg-gray-200" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !blog) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <EmptyState
          title="Article not found"
          message={error || 'This article may have been unpublished or removed.'}
          action={
            <Link to="/blog" className={buttonStyles({ variant: 'primary', size: 'sm' })}>
              Back to Blog
            </Link>
          }
        />
      </section>
    );
  }

  // Defense in depth: content is sanitized server-side on save; sanitize
  // again at render so nothing unsafe is ever injected into the DOM.
  const sanitizedContent = DOMPurify.sanitize(blog.content, {
    ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'p', 'strong', 'em', 'u', 's', 'a', 'ul', 'ol', 'li', 'blockquote', 'img', 'br', 'hr', 'code', 'pre', 'span'],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'src', 'alt', 'width', 'height'],
    ALLOW_DATA_ATTR: false,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <Link to="/blog" className={buttonStyles({ variant: 'outline' })}>
        ← Back to Blog
      </Link>

      <div className="mt-8 grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_20rem]">
    <article className="min-w-0">

      <header>
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span className="rounded-full bg-brand-50 px-2.5 py-0.5 font-semibold text-brand-800">
            {blog.category || 'General'}
          </span>
          <time dateTime={blog.publishedAt}>{formatFullDate(blog.publishedAt)}</time>
          <span aria-hidden="true">·</span>
          <span>{readingTime(blog.content)} min read</span>
        </div>
        <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-gray-900 sm:text-4xl">
          {blog.title}
        </h1>
        <p className="mt-3 text-sm text-gray-500">
          By <span className="font-medium text-gray-700">{blog.author?.name ?? 'Animals Super Store'}</span>
        </p>
      </header>

      {blog.coverImage?.url && (
        <ImageWithFallback
          src={blog.coverImage.url}
          alt={blog.title}
          className="mt-8 aspect-[16/9] w-full rounded-xl border border-gray-200 object-cover"
        />
      )}

      {/* Sanitized rich text content */}
      <div
        className="prose prose-gray mt-10 max-w-none prose-headings:font-bold prose-a:text-brand-700 prose-img:rounded-xl prose-blockquote:border-brand-300 prose-blockquote:text-gray-600"
        // Content is sanitized above before it ever reaches the DOM.
        dangerouslySetInnerHTML={{ __html: sanitizedContent }}
      />

      {blog.tags?.length > 0 && (
        <footer className="mt-10 flex flex-wrap gap-2 border-t border-gray-200 pt-6">
          {blog.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
              #{tag}
            </span>
          ))}
        </footer>
      )}

    </article>

    {/* Suggested posts */}
    {suggested.length > 0 && (
      <aside aria-label="Suggested blogs" className="lg:sticky lg:top-24 lg:self-start">
        <h2 className="text-lg font-bold text-gray-900">More blogs you may like</h2>
        <ul className="mt-4 space-y-4">
          {suggested.map((item) => (
            <li key={item._id ?? item.slug}>
              <Link
                to={`/blog/${item.slug}`}
                className="group flex gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-xs transition-colors hover:border-brand-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
              >
                <div className="h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                  <ImageWithFallback
                    src={item.coverImage?.url}
                    optimize={240}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-gray-900 group-hover:text-brand-700">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">
                    {item.category || 'General'} · {formatFullDate(item.publishedAt)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
        <Link to="/blog" className="mt-4 inline-block text-sm font-semibold text-brand-700 hover:underline">
          View all blogs →
        </Link>
      </aside>
    )}
      </div>
    </div>
  );
}