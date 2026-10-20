import api from './api.js';

/** Listing API calls — every listing interaction goes through this service. */
export const listingService = {
  getListings: (params) => api.get('/listings', { params }).then((res) => res.data.data),
  getListingBySlug: (slug) => api.get(`/listings/${slug}`).then((res) => res.data.data.listing),
  getManagedListing: (id) => api.get(`/listings/${id}/manage`).then((res) => res.data.data.listing),
  createListing: (formData) =>
    api
      .post('/listings', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((res) => res.data.data.listing),
  updateListing: (id, formData) =>
    api
      .put(`/listings/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((res) => res.data.data.listing),
  deleteListing: (id) => api.delete(`/listings/${id}`),
  markSold: (id) => api.patch(`/listings/${id}/sold`).then((res) => res.data.data.listing),
  archiveListing: (id) => api.patch(`/listings/${id}/archive`).then((res) => res.data.data.listing),
  getMyListings: (params) => api.get('/users/me/listings', { params }).then((res) => res.data.data),
};
