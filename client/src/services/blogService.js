import api from './api.js';

/** Blog API calls — public reads plus the admin management surface. */
export const blogService = {
  // Public
  getBlogs: (params) => api.get('/blogs', { params }).then((res) => res.data.data),
  getBlogBySlug: (slug) => api.get(`/blogs/${slug}`).then((res) => res.data.data.blog),

  // Admin
  adminGetBlogs: (params) => api.get('/admin/blogs', { params }).then((res) => res.data.data),
  adminGetBlog: (id) => api.get(`/admin/blogs/${id}`).then((res) => res.data.data.blog),
  createBlog: (formData) =>
    api
      .post('/admin/blogs', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((res) => res.data.data.blog),
  updateBlog: (id, formData) =>
    api
      .put(`/admin/blogs/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((res) => res.data.data.blog),
  deleteBlog: (id) => api.delete(`/admin/blogs/${id}`),
  publishBlog: (id) => api.patch(`/admin/blogs/${id}/publish`).then((res) => res.data.data.blog),
  unpublishBlog: (id) => api.patch(`/admin/blogs/${id}/unpublish`).then((res) => res.data.data.blog),
  archiveBlog: (id) => api.patch(`/admin/blogs/${id}/archive`).then((res) => res.data.data.blog),
  uploadImage: (file) => {
    const formData = new FormData();
    formData.append('image', file);
    return api
      .post('/admin/uploads', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((res) => res.data.data.image);
  },
};
