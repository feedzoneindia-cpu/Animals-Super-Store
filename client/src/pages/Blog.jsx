import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import BlogCard from '../components/blog/BlogCard.jsx';
import BlogCardSkeleton from '../components/blog/BlogCardSkeleton.jsx';
import Button from '../components/common/Button.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import Pagination from '../components/common/Pagination.jsx';
import { DEFAULT_BLOG_PAGE_SIZE } from '../constants/blog.js';
import useDebounce from '../hooks/useDebounce.js';
import useSEO from '../hooks/useSEO.js';
import { blogService } from '../services/blogService.js';

export default function Blog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = useMemo(
    () => ({
      q: searchParams.get('q') ?? '',
      category: searchParams.get('category') ?? '',
      page: Number(searchParams.get('page')) || 1,
    }),
    [searchParams]
  );

  const [searchText, setSearchText] = useState(query.q);
  const debouncedSearch = useDebounce(searchText);
  const [result, setResult] = useState({ blogs: [], pagination: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useSEO({
    title: 'Blog',
    // Search / filter / page-2+ URLs duplicate the main page: keep them out of the index.
    noindex: searchParams.toString() !== '',
    description:
      'Animals-focused guides, care tips, and stories from the Animals Super Store community.',
  });

  // Debounce the search box into the URL; the fetch effect only reacts
  // to URL changes, keeping one request per change.
  useEffect(() => {
    if ((searchParams.get('q') ?? '') !== searchText) {
      const next = new URLSearchParams(searchParams);
      if (searchText) next.set('q', searchText);
      else next.delete('q');
      next.delete('page');
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    const params = { page: query.page, limit: DEFAULT_BLOG_PAGE_SIZE };
    if (query.q) params.q = query.q;
    if (query.category) params.category = query.category;

    blogService
      .getBlogs(params)
      .then((data) => {
        if (!cancelled) setResult(data);
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
  }, [query]);

  const handlePageChange = (page) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(page));
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Blog</h1>
        <p className="mt-2 text-sm text-gray-600">
          Useful Animals-focused guides, care tips, and stories from the Animals Super Store community.
        </p>
      </div>

      {/* Search */}
      <form className="mt-6 max-w-xl" role="search" onSubmit={(event) => event.preventDefault()}>
        <label htmlFor="blog-search" className="sr-only">
          Search articles
        </label>
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
          </svg>
          <input
            id="blog-search"
            type="search"
            className="mt-1 block w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-4 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-700/20"
            placeholder="Search articles, e.g. dog food"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
        </div>
      </form>

      {error ? (
        <div className="mt-8">
          <EmptyState
            title="Something went wrong"
            message={error}
            action={
              <Button variant="primary" size="sm" onClick={() => setSearchParams(new URLSearchParams(searchParams))}>
                Try Again
              </Button>
            }
          />
        </div>
      ) : loading ? (
        <div className="stagger mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <BlogCardSkeleton key={i} />
          ))}
        </div>
      ) : result.blogs.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No articles found"
            message={
              query.q
                ? 'No articles match your search. Try a different term.'
                : 'Published articles will appear here soon. Check back in a little while.'
            }
          />
        </div>
      ) : (
        <>
          <div className="stagger mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {result.blogs.map((blog) => (
              <BlogCard key={blog._id} blog={blog} />
            ))}
          </div>
          <Pagination
            className="mt-10"
            page={result.pagination.page}
            totalPages={result.pagination.totalPages}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </section>
  );
}
