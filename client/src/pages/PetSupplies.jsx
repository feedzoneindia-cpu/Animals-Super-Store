import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Button from '../components/common/Button.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import Pagination from '../components/common/Pagination.jsx';
import ListingCardSkeleton from '../components/listings/ListingCardSkeleton.jsx';
import ProductTile from '../components/listings/ProductTile.jsx';
import { DEFAULT_PAGE_SIZE } from '../constants/listings.js';
import useDebounce from '../hooks/useDebounce.js';
import useSEO from '../hooks/useSEO.js';
import { listingService } from '../services/listingService.js';

const SUPPLY_CATEGORIES = [
  { id: 'all', label: 'All Pet Supplies' },
  { id: 'Animals Accessories', label: 'Animals Accessories' },
  { id: 'Animals Equipment', label: 'Animals Equipment' },
];

const SORT_OPTIONS = [
  { value: 'latest', label: 'Latest Arrivals' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
];

export default function PetSupplies() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentCategory = searchParams.get('category') || 'all';
  const currentSort = searchParams.get('sort') || 'latest';
  const page = Number(searchParams.get('page')) || 1;
  const initialSearch = searchParams.get('q') || '';

  useSEO({
    title: 'Pet Supplies & Equipment',
    // Search / filter / page-2+ URLs duplicate the main page: keep them out of the index.
    noindex: searchParams.toString() !== '',
    description:
      'Browse collars, leashes, feeding bowls, cages, tanks, grooming items, and practical Animals-care equipment.',
  });

  const [searchText, setSearchText] = useState(initialSearch);
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
    let cancelled = false;
    setLoading(true);
    setError('');

    async function fetchSupplies() {
      try {
        if (currentCategory === 'all') {
          // Fetch both categories in parallel and combine
          const [accData, eqData] = await Promise.all([
            listingService.getListings({
              category: 'Animals Accessories',
              q: debouncedSearch,
              sort: currentSort,
              limit: 24,
            }),
            listingService.getListings({
              category: 'Animals Equipment',
              q: debouncedSearch,
              sort: currentSort,
              limit: 24,
            }),
          ]);

          if (cancelled) return;

          const combined = [...(accData.listings || []), ...(eqData.listings || [])];
          // Sort combined according to currentSort
          if (currentSort === 'price-asc') {
            combined.sort((a, b) => a.price - b.price);
          } else if (currentSort === 'price-desc') {
            combined.sort((a, b) => b.price - a.price);
          } else {
            combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          }

          setResult({
            listings: combined,
            pagination: {
              page: 1,
              totalPages: 1,
              totalResults: combined.length,
            },
          });
        } else {
          // Fetch single specific category
          const data = await listingService.getListings({
            category: currentCategory,
            q: debouncedSearch,
            sort: currentSort,
            page,
            limit: DEFAULT_PAGE_SIZE,
          });
          if (cancelled) return;
          setResult(data);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchSupplies();

    return () => {
      cancelled = true;
    };
  }, [currentCategory, debouncedSearch, currentSort, page]);

  const handleCategoryChange = (catId) => {
    const next = new URLSearchParams(searchParams);
    if (catId === 'all') {
      next.delete('category');
    } else {
      next.set('category', catId);
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

  return (
    <div className="min-h-screen bg-white py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Banner */}
        <div className="rounded-2xl surface-brand p-8 text-white shadow-sm sm:p-10">
          <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white ring-1 ring-inset ring-white/25">
            Comfort, Care & Gear
          </span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Pet Supplies & Animals Equipment
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-brand-50 sm:text-base">
            From leather collars, sturdy leashes, and stainless steel bowls to heavy-duty cages, tanks, and grooming kits. Everything your Animals need for safety and comfort.
          </p>
        </div>

        {/* Category Tabs */}
        <div className="mt-8 flex flex-wrap gap-2 border-b border-gray-200 pb-4">
          {SUPPLY_CATEGORIES.map((tab) => {
            const isActive =
              tab.id === 'all' ? currentCategory === 'all' : currentCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleCategoryChange(tab.id)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-brand-700 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Filter Controls */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <input
              type="search"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search collars, bowls, cages, tanks…"
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
            <label htmlFor="supplies-sort" className="text-xs font-medium text-gray-600">
              Sort by:
            </label>
            <select
              id="supplies-sort"
              value={currentSort}
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

        {/* Listings */}
        <div className="mt-8">
          {loading ? (
            <div className="stagger grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <ListingCardSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
              {error}
            </div>
          ) : result.listings.length === 0 ? (
            <EmptyState
              title="No supplies found"
              message={
                searchText
                  ? `No pet supplies matched "${searchText}".`
                  : 'Currently no pet supplies are listed in this category.'
              }
              action={
                <Link to="/shop">
                  <Button variant="outline" size="sm">
                    Browse All Products
                  </Button>
                </Link>
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
