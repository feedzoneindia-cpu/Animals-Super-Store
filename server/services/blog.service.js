import Blog from '../models/Blog.js';
import { ApiError } from '../utils/ApiError.js';
import { sanitizeRichText } from '../utils/sanitizeHtml.js';
import { escapeRegex, generateUniqueSlug, slugify } from '../utils/slug.js';
import { destroyImage, uploadImage } from './cloudinary.service.js';

function buildPaginationMeta(page, limit, totalResults) {
  return {
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(totalResults / limit)),
    totalResults,
  };
}

async function paginate(query, filter, sortString) {
  const { page, limit } = query;
  const [blogs, totalResults] = await Promise.all([
    Blog.find(filter)
      .sort(sortString)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('author', 'name'),
    Blog.countDocuments(filter),
  ]);
  return { blogs, pagination: buildPaginationMeta(page, limit, totalResults) };
}

/** Public listing — only published blogs are ever visible. */
export async function searchPublishedBlogs(query) {
  const { q, category, sort, page, limit } = query;

  const filter = { status: 'published' };
  if (q) {
    filter.title = { $regex: escapeRegex(q), $options: 'i' };
  }
  if (category) {
    filter.category = { $regex: escapeRegex(category), $options: 'i' };
  }

  return paginate(query, filter, sort === 'oldest' ? 'publishedAt' : '-publishedAt');
}

export async function getPublishedBlogBySlug(slug) {
  const blog = await Blog.findOne({ slug, status: 'published' }).populate('author', 'name createdAt');
  if (!blog) {
    throw ApiError.notFound('Article not found');
  }
  return blog;
}

export async function adminListBlogs(query) {
  const { q, status, page, limit } = query;

  const filter = {};
  if (status) {
    filter.status = status;
  }
  if (q) {
    filter.title = { $regex: escapeRegex(q), $options: 'i' };
  }

  return paginate(query, filter, '-createdAt');
}

export async function adminGetBlog(id) {
  const blog = await Blog.findById(id).populate('author', 'name');
  if (!blog) {
    throw ApiError.notFound('Article not found');
  }
  return blog;
}

export async function createBlog(author, body, coverFile) {
  const coverImage = coverFile
    ? await uploadImage(coverFile.buffer, 'Animals-super-store/blogs')
    : { url: '', publicId: '' };

  const status = body.status ?? 'draft';

  return Blog.create({
    title: body.title,
    slug: await generateUniqueSlug(slugify(body.title), Blog),
    excerpt: body.excerpt,
    content: sanitizeRichText(body.content),
    coverImage,
    category: body.category || 'General',
    tags: body.tags ?? [],
    author: author._id,
    status,
    publishedAt: status === 'published' ? new Date() : null,
  });
}

export async function updateBlog(blog, body, coverFile) {
  // Cover image rules: a new file replaces the old one (destroying the old
  // Cloudinary asset); otherwise the existing cover is kept only if the
  // client explicitly sends it back and it matches what is stored.
  if (coverFile) {
    await destroyImage(blog.coverImage?.publicId);
    blog.coverImage = await uploadImage(coverFile.buffer, 'Animals-super-store/blogs');
  } else if (body.existingCoverImage && blog.coverImage?.url === body.existingCoverImage.url) {
    // keep current cover
  } else {
    await destroyImage(blog.coverImage?.publicId);
    blog.coverImage = { url: '', publicId: '' };
  }

  blog.title = body.title;
  blog.excerpt = body.excerpt;
  blog.content = sanitizeRichText(body.content);
  blog.category = body.category || 'General';
  blog.tags = body.tags ?? [];

  // Publishing through the dedicated endpoint is the primary flow, but a
  // status change arriving with an edit is honoured too.
  if (body.status && body.status !== blog.status) {
    blog.status = body.status;
    if (body.status === 'published') {
      blog.publishedAt = new Date();
    }
  }

  await blog.save();
  return blog;
}

export async function deleteBlog(blog) {
  await destroyImage(blog.coverImage?.publicId);
  await blog.deleteOne();
}

export async function publishBlog(blog) {
  if (blog.status === 'published') return blog;
  blog.status = 'published';
  blog.publishedAt = new Date();
  await blog.save();
  return blog;
}

export async function unpublishBlog(blog) {
  if (blog.status === 'draft') return blog;
  blog.status = 'draft';
  await blog.save();
  return blog;
}

export async function archiveBlog(blog) {
  if (blog.status === 'archived') return blog;
  blog.status = 'archived';
  await blog.save();
  return blog;
}
