import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Button from '../components/common/Button.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import Pagination from '../components/common/Pagination.jsx';
import ListingCardSkeleton from '../components/listings/ListingCardSkeleton.jsx';
import ProductTile from '../components/listings/ProductTile.jsx';
import { DEFAULT_PAGE_SIZE, LISTING_CATEGORIES } from '../constants/listings.js';
import useDebounce from '../hooks/useDebounce.js';
import useSEO from '../hooks/useSEO.js';
import { listingService } from '../services/listingService.js';

const SORT_OPTIONS = [
  { value: 'latest', label: 'Latest Arrivals' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
];

function parseQuery(searchParams) {
  return {
    q: searchParams.get('q') ?? '',
    category: searchParams.get('category') ?? '',
    location: searchParams.get('location') ?? '',
    minPrice: searchParams.get('minPrice') ?? '',
    maxPrice: searchParams.get('maxPrice') ?? '',
    sort: searchParams.get('sort') ?? 'latest',
    page: Number(searchParams.get('page')) || 1,
  };
}

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = useMemo(() => parseQuery(searchParams), [searchParams]);

  useSEO({
    title: 'Shop Products & Supplies',
    // Search / filter / page-2+ URLs duplicate the main page: keep them out of the index.
    noindex: searchParams.toString() !== '',
    description:
      'Browse and buy quality Animals food, pet accessories, Animals equipment, and view Animals listings across categories.',
  });

  const [searchText, setSearchText] = useState(query.q);
  const [result, setResult] = useState({ listings: [], pagination: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const debouncedSearch = useDebounce(searchText);

  useEffect(() => {
    if ((searchParams.get('q') ?? '') !== debouncedSearch) {
      const next = new URLSearchParams(searchParams);
      if (debouncedSearch) next.set('q', debouncedSearch);
      else next.delete('q');
      next.delete('page');
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  useEffect(() => {
    setSearchText(searchParams.get('q') ?? '');
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    const params = {
      ...query,
      limit: DEFAULT_PAGE_SIZE,
    };

    listingService
      .getListings(params)
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

  const handleCategoryClick = (catName) => {
    const next = new URLSearchParams(searchParams);
    if (catName === '' || query.category === catName) {
      next.delete('category');
    } else {
      next.set('category', catName);
    }
    next.delete('page');
    setSearchParams(next);
  };

  const handleSortChange = (e) => {
    const next = new URLSearchParams(searchParams);
    next.set('sort', e.target.value);
    setSearchParams(next);
  };

  const handlePageChange = (newPage) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(newPage));
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResetFilters = () => {
    setSearchParams({});
    setSearchText('');
  };

  return (
    <div className="bg-gray-50/50 min-h-screen py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-gray-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
              Products & Marketplace
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Explore Animals food, pet accessories, supplies, equipment, and ethical Animals rehoming.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/cart"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
            >
              <span>🛒 View Cart</span>
            </Link>
          </div>
        </div>

        {/* Search Bar & Category Pills */}
        <div className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <input
                type="search"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search feeds, bowls, cages, or Animals…"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 pl-10 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-700/20"
              />
              <svg
                className="absolute left-3 top-3 h-4 w-4 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="shop-sort" className="shrink-0 text-xs font-medium text-gray-600">
                Sort:
              </label>
              <select
                id="shop-sort"
                value={query.sort}
                onChange={handleSortChange}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-brand-700 focus:outline-none"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleCategoryClick('')}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                !query.category
                  ? 'bg-brand-700 text-white'
                  : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              All Items
            </button>
            {LISTING_CATEGORIES.map((cat) => (
              <button
                key={cat.name}
                type="button"
                onClick={() => handleCategoryClick(cat.name)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                  query.category === cat.name
                    ? 'bg-brand-700 text-white'
                    : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {cat.name}
              </button>
            ))}
            {(query.category || query.q) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-medium text-gray-500 underline hover:text-gray-900"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Results Grid */}
        <div className="mt-8">
          {loading ? (
            <div className="stagger grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <ListingCardSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
              {error}
            </div>
          ) : result.listings.length === 0 ? (
            <EmptyState
              title="No products found"
              message="No items match your selected filters or search terms."
              action={
                <Button variant="outline" size="sm" onClick={handleResetFilters}>
                  View All Products
                </Button>
              }
            />
          ) : (
            <>
              <div className="stagger grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {result.listings.map((listing) => (
                  <ProductTile key={listing._id} listing={listing} />
                ))}
              </div>

              {result.pagination && result.pagination.totalPages > 1 && (
                <div className="mt-10">
                  <Pagination
                    page={result.pagination.page}
                    totalPages={result.pagination.totalPages}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
