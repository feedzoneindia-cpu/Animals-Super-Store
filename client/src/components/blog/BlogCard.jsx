import { Link } from 'react-router-dom';
import { formatFullDate } from '../../utils/format.js';
import ImageWithFallback from '../common/ImageWithFallback.jsx';

/** Blog card for the public blog listing and home page. */
export default function BlogCard({ blog }) {
  return (
    <Link
      to={`/blog/${blog.slug}`}
      className="card-lift group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-gray-100">
        <ImageWithFallback
          src={blog.coverImage?.url}
          optimize={800}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="rounded-full bg-brand-50 px-2.5 py-0.5 font-semibold text-brand-800">
            {blog.category || 'General'}
          </span>
          <time dateTime={blog.publishedAt}>{formatFullDate(blog.publishedAt)}</time>
        </div>
        <h3 className="mt-3 line-clamp-2 text-lg font-semibold leading-snug text-gray-900 group-hover:text-brand-700">
          {blog.title}
        </h3>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-600">{blog.excerpt}</p>
        <p className="mt-auto pt-4 text-sm text-gray-500">
          By <span className="font-medium text-gray-700">{blog.author?.name ?? 'Animals Super Store'}</span>
        </p>
      </div>
    </Link>
  );
}
