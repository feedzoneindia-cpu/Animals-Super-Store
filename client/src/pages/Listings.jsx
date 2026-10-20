import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Button from '../components/common/Button.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import Pagination from '../components/common/Pagination.jsx';
import ListingCard from '../components/listings/ListingCard.jsx';
import ListingCardSkeleton from '../components/listings/ListingCardSkeleton.jsx';
import ListingFilters from '../components/listings/ListingFilters.jsx';
import { DEFAULT_PAGE_SIZE } from '../constants/listings.js';
import useDebounce from '../hooks/useDebounce.js';
import useSEO from '../hooks/useSEO.js';
import { listingService } from '../services/listingService.js';

function parseQuery(searchParams) {
  return {
    q: searchParams.get('q') ?? '',
    category: searchParams.get('category') ?? '',
    location: searchParams.get('location') ?? '',
    minPrice: searchParams.get('minPrice') ?? '',
    maxPrice: searchParams.get('maxPrice') ?? '',
    // Animals filters (used while browsing the Animals category).
    AnimalsType: searchParams.get('AnimalsType') ?? '',
    gender: searchParams.get('gender') ?? '',
    breed: searchParams.get('breed') ?? '',
    minAgeMonths: searchParams.get('minAgeMonths') ?? '',
    maxAgeMonths: searchParams.get('maxAgeMonths') ?? '',
    sort: searchParams.get('sort') ?? 'latest',
    page: Number(searchParams.get('page')) || 1,
  };
}

/** Which min/max month pair each age bucket on the filter bar means. */
const AGE_RANGE_BOUNDS = {
  '0-6': { min: '0', max: '6' },
  '6-12': { min: '6', max: '12' },
  '12-36': { min: '12', max: '36' },
  '36-': { min: '36', max: '' },
};

/** Builds clean params — empty values are omitted so URLs stay readable. */
function toSearchParams(query) {
  const params = {};
  Object.entries(query).forEach(([key, value]) => {
    if (value !== '' && value !== undefined && value !== null) {
      params[key] = String(value);
    }
  });
  return params;
}

export default function Listings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = useMemo(() => parseQuery(searchParams), [searchParams]);

  useSEO({
    title: 'Browse Listings',
    description:
      'Search Animals-related products and items — food, accessories, and equipment — plus Animals looking for a home, by category, price, and location.',
  });

  const [searchText, setSearchText] = useState(query.q);
  const [locationText, setLocationText] = useState(query.location);
  const [breedText, setBreedText] = useState(query.breed);
  const [result, setResult] = useState({ listings: [], pagination: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const debouncedSearch = useDebounce(searchText);
  const debouncedLocation = useDebounce(locationText);
  const debouncedBreed = useDebounce(breedText);

  // Text inputs are debounced into the URL; the fetch effect below reacts
  // to URL changes only, so there is exactly one request per change.
  useEffect(() => {
    const updates = { q: searchText, location: locationText, breed: breedText };
    const changed = Object.entries(updates).some(
      ([key, value]) => (searchParams.get(key) ?? '') !== value
    );
    if (changed) {
      const next = new URLSearchParams(searchParams);
      Object.entries(updates).forEach(([key, value]) => {
        if (value) next.set(key, value);
        else next.delete(key);
      });
      next.delete('page'); // a new search restarts pagination
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, debouncedLocation, debouncedBreed]);

  useEffect(() => {
    setSearchText(searchParams.get('q') ?? '');
    setLocationText(searchParams.get('location') ?? '');
    setBreedText(searchParams.get('breed') ?? '');
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    listingService
      .getListings({ ...toSearchParams(query), limit: DEFAULT_PAGE_SIZE })
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

  const updateFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value && !(key === 'sort' && value === 'latest')) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    if (key !== 'page') next.delete('page');
    setSearchParams(next);
  };

  const handleSearchChange = (key, value) => {
    if (key === 'q') setSearchText(value);
    if (key === 'location') setLocationText(value);
    if (key === 'breed') setBreedText(value);
  };

  /** The age bucket sets (or clears) the min/max months params together. */
  const handleAgeRangeChange = (bucket) => {
    const next = new URLSearchParams(searchParams);
    const bounds = AGE_RANGE_BOUNDS[bucket];
    for (const key of ['minAgeMonths', 'maxAgeMonths']) {
      if (bounds?.[key === 'minAgeMonths' ? 'min' : 'max']) {
        next.set(key, bounds[key === 'minAgeMonths' ? 'min' : 'max']);
      } else {
        next.delete(key);
      }
    }
    next.delete('page');
    setSearchParams(next);
  };

  const handlePageChange = (page) => {
    updateFilter('page', page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const retry = () => setSearchParams(new URLSearchParams(searchParams));

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Browse Listings</h1>
          <p className="mt-2 text-sm text-gray-600">
            Animals-related products and items — and Animals looking for a home — from our community.
          </p>
        </div>
        {result.pagination && (
          <p className="text-sm text-gray-500">
            {result.pagination.totalResults} listing{result.pagination.totalResults === 1 ? '' : 's'}
          </p>
        )}
      </div>

      <div className="mt-6">
        <ListingFilters
          values={{ ...query, q: searchText, location: locationText, breed: breedText }}
          onFilterChange={updateFilter}
          onSearchChange={handleSearchChange}
          onAgeRangeChange={handleAgeRangeChange}
        />
      </div>

      {error ? (
        <div className="mt-8">
          <EmptyState
            title="Something went wrong"
            message={error}
            action={
              <Button variant="primary" size="sm" onClick={retry}>
                Try Again
              </Button>
            }
          />
        </div>
      ) : loading ? (
        <div className="stagger mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </div>
      ) : result.listings.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No listings found"
            message={
              Object.entries(query).some(
                ([key, value]) => !['sort', 'page'].includes(key) && value !== ''
              )
                ? 'No listings match your filters. Try adjusting your search.'
                : 'Listings will appear here as soon as they are posted. Be the first!'
            }
          />
        </div>
      ) : (
        <>
          <div className="stagger mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {result.listings.map((listing) => (
              <ListingCard key={listing._id} listing={listing} />
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
