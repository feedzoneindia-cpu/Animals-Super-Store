import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ListingForm from '../components/listings/ListingForm.jsx';
import Spinner from '../components/common/Spinner.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { buttonStyles } from '../components/common/Button.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { listingService } from '../services/listingService.js';
import { LISTING_STATUS_STYLES } from '../constants/listings.js';

export default function EditListing() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    listingService
      .getManagedListing(id)
      .then((data) => {
        if (!cancelled) setListing(data);
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
  }, [id]);

  const handleSubmit = async (formData) => {
    await listingService.updateListing(id, formData);
    toast('Listing updated successfully.');
    navigate('/my-listings');
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" label="Loading your listing" />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <EmptyState
          title="Listing not found"
          message={error || 'This listing could not be loaded for editing.'}
          action={
            <Link to="/my-listings" className={buttonStyles({ variant: 'primary', size: 'sm' })}>
              Back to My Listings
            </Link>
          }
        />
      </section>
    );
  }

  const statusStyle = LISTING_STATUS_STYLES[listing.status] ?? '';

  return (
    <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Edit Listing</h1>
          <p className="mt-2 text-sm text-gray-600">
            Status:{' '}
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusStyle}`}>
              {listing.status}
            </span>
          </p>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <ListingForm
          initialValues={listing}
          initialImages={listing.images ?? []}
          submitLabel="Save Changes"
          onSubmit={handleSubmit}
        />
      </div>
    </section>
  );
}
