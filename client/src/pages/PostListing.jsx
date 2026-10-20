import { useNavigate } from 'react-router-dom';
import ListingForm from '../components/listings/ListingForm.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import useSEO from '../hooks/useSEO.js';
import { listingService } from '../services/listingService.js';

export default function PostListing() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useSEO({
    title: 'Post a Listing', noindex: true,
    description:
      'List an Animals-related product or item, or an Animals, for sale. Listings go live immediately — no waiting.',
  });

  const handleSubmit = async (formData) => {
    // The backend publishes immediately — no approval step anywhere.
    const listing = await listingService.createListing(formData);
    toast('Your listing is live!');
    navigate(`/listings/${listing.slug}`);
  };

  return (
    <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Post a Listing</h1>
        <p className="mt-2 text-sm text-gray-600">
          List an Animals-related product or item — or an Animals. Your listing goes live immediately
          after you publish.
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <ListingForm
          initialValues={{
            sellerName: user?.name ?? '',
            contactNumber: user?.phone ?? '',
            contactEmail: user?.email ?? '',
          }}
          submitLabel="Publish Listing"
          stepped
          onCancel={() => navigate(window.history.length > 1 ? -1 : '/')}
          onSubmit={handleSubmit}
        />
      </div>
    </section>
  );
}