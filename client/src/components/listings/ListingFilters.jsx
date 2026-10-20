import {
    Animals_CATEGORY,
    Animals_GENDERS,
    Animals_TYPES,
    LISTING_CATEGORIES,
    LISTING_SORT_OPTIONS,
} from '../../constants/listings.js';

const SELECT_CLASS =
  'mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-700/20';

const INPUT_CLASS =
  'mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-700/20';

/**
 * Practical age buckets — far easier to pick than a raw month range, and each
 * maps onto the server's minAgeMonths / maxAgeMonths params.
 */
const AGE_RANGES = [
  { value: '0-6', label: 'Under 6 months', min: 0, max: 6 },
  { value: '6-12', label: '6–12 months', min: 6, max: 12 },
  { value: '12-36', label: '1–3 years', min: 12, max: 36 },
  { value: '36-', label: 'Over 3 years', min: 36, max: null },
];

/** Which bucket (if any) the current min/max params correspond to. */
function ageRangeFromParams(minAgeMonths, maxAgeMonths) {
  const min = minAgeMonths === '' ? null : Number(minAgeMonths);
  const max = maxAgeMonths === '' ? null : Number(maxAgeMonths);
  const match = AGE_RANGES.find((range) => range.min === min && range.max === max);
  return match?.value ?? '';
}

/**
 * Search and filter bar for the listings page. Values are controlled by the
 * parent (which syncs them to URL query params). Choosing the "Animals"
 * category reveals the Animals-specific filters; every other category keeps
 * the original filter set.
 */
export default function ListingFilters({ values, onSearchChange, onFilterChange, onAgeRangeChange }) {
  const isAnimals = values.category === Animals_CATEGORY;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <form
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        onSubmit={(event) => event.preventDefault()}
      >
        <div className="sm:col-span-2">
          <label htmlFor="filter-q" className="block text-sm font-medium text-gray-700">
            Search
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
              id="filter-q"
              type="search"
              className={`${INPUT_CLASS} pl-9`}
              placeholder={isAnimals ? 'Search by title, e.g. golden retriever' : 'Search by title, e.g. dog food'}
              value={values.q}
              onChange={(event) => onSearchChange('q', event.target.value)}
            />
          </div>
        </div>

        <div>
          <label htmlFor="filter-category" className="block text-sm font-medium text-gray-700">
            Category
          </label>
          <select
            id="filter-category"
            className={SELECT_CLASS}
            value={values.category}
            onChange={(event) => onFilterChange('category', event.target.value)}
          >
            <option value="">All categories</option>
            {LISTING_CATEGORIES.map((category) => (
              <option key={category.name} value={category.name}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-location" className="block text-sm font-medium text-gray-700">
            Location
          </label>
          <input
            id="filter-location"
            type="text"
            className={INPUT_CLASS}
            placeholder="e.g. Lucknow"
            value={values.location}
            onChange={(event) => onSearchChange('location', event.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="filter-min-price" className="block text-sm font-medium text-gray-700">
              Min price (₹)
            </label>
            <input
              id="filter-min-price"
              type="number"
              min="0"
              className={INPUT_CLASS}
              placeholder="0"
              value={values.minPrice}
              onChange={(event) => onFilterChange('minPrice', event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="filter-max-price" className="block text-sm font-medium text-gray-700">
              Max price (₹)
            </label>
            <input
              id="filter-max-price"
              type="number"
              min="0"
              className={INPUT_CLASS}
              placeholder="Any"
              value={values.maxPrice}
              onChange={(event) => onFilterChange('maxPrice', event.target.value)}
            />
          </div>
        </div>

        {/* Animals filters — only meaningful while browsing the Animals category. */}
        {isAnimals && (
          <>
            <div>
              <label htmlFor="filter-Animals-type" className="block text-sm font-medium text-gray-700">
                Animals type
              </label>
              <select
                id="filter-Animals-type"
                className={SELECT_CLASS}
                value={values.AnimalsType}
                onChange={(event) => onFilterChange('AnimalsType', event.target.value)}
              >
                <option value="">All Animals types</option>
                {Animals_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="filter-breed" className="block text-sm font-medium text-gray-700">
                Breed
              </label>
              <input
                id="filter-breed"
                type="text"
                className={INPUT_CLASS}
                placeholder="e.g. Golden Retriever"
                value={values.breed}
                onChange={(event) => onSearchChange('breed', event.target.value)}
              />
            </div>

            <div>
              <label htmlFor="filter-gender" className="block text-sm font-medium text-gray-700">
                Gender
              </label>
              <select
                id="filter-gender"
                className={SELECT_CLASS}
                value={values.gender}
                onChange={(event) => onFilterChange('gender', event.target.value)}
              >
                <option value="">Any gender</option>
                {Animals_GENDERS.map((gender) => (
                  <option key={gender} value={gender}>
                    {gender}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="filter-age" className="block text-sm font-medium text-gray-700">
                Age
              </label>
              <select
                id="filter-age"
                className={SELECT_CLASS}
                value={ageRangeFromParams(values.minAgeMonths, values.maxAgeMonths)}
                onChange={(event) => onAgeRangeChange(event.target.value)}
              >
                <option value="">Any age</option>
                {AGE_RANGES.map((range) => (
                  <option key={range.value} value={range.value}>
                    {range.label}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        <div>
          <label htmlFor="filter-sort" className="block text-sm font-medium text-gray-700">
            Sort by
          </label>
          <select
            id="filter-sort"
            className={SELECT_CLASS}
            value={values.sort}
            onChange={(event) => onFilterChange('sort', event.target.value)}
          >
            {LISTING_SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </form>
    </div>
  );
}
