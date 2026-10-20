import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Button, { buttonStyles } from '../../components/common/Button.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import FormInput, { FormError } from '../../components/common/FormInput.jsx';
import ImageWithFallback from '../../components/common/ImageWithFallback.jsx';
import RichTextEditor from '../../components/blog/RichTextEditor.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { blogService } from '../../services/blogService.js';
import useSEO from '../../hooks/useSEO.js';

const MAX_COVER_MB = 2;

/** Strips HTML tags to measure whether the editor has real content. */
const textLength = (html) => String(html ?? '').replace(/<[^>]*>/g, '').trim().length;

export default function AdminBlogForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { toast } = useToast();

  useSEO({ title: isEdit ? 'Edit Blog' : 'New Blog', noindex: true });

  const [form, setForm] = useState({
    title: '',
    excerpt: '',
    category: '',
    tags: '',
    content: '',
  });
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(''); // object URL for new file
  const [existingCover, setExistingCover] = useState(null); // { url, publicId } kept on edit
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return undefined;
    let cancelled = false;
    setLoading(true);
    blogService
      .adminGetBlog(id)
      .then((blog) => {
        if (cancelled) return;
        setForm({
          title: blog.title ?? '',
          excerpt: blog.excerpt ?? '',
          category: blog.category ?? '',
          tags: (blog.tags ?? []).join(', '),
          content: blog.content ?? '',
        });
        setExistingCover(blog.coverImage ?? null);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, isEdit]);

  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCoverSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrors((prev) => ({ ...prev, coverImage: 'Please select an image file.' }));
      event.target.value = '';
      return;
    }
    if (file.size > MAX_COVER_MB * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, coverImage: `Cover image must be smaller than ${MAX_COVER_MB} MB.` }));
      event.target.value = '';
      return;
    }
    setErrors((prev) => ({ ...prev, coverImage: '' }));
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const clearCover = () => {
    setCoverFile(null);
    setCoverPreview('');
    setExistingCover(null);
  };

  const validate = () => {
    const next = {};
    if (form.title.trim().length < 5 || form.title.trim().length > 150) {
      next.title = 'Title must be between 5 and 150 characters.';
    }
    if (form.excerpt.trim().length < 10 || form.excerpt.trim().length > 300) {
      next.excerpt = 'Excerpt must be between 10 and 300 characters.';
    }
    if (textLength(form.content) < 20) {
      next.content = 'Content is too short — write at least a couple of sentences.';
    }
    if (form.category.trim().length > 50) {
      next.category = 'Category must be at most 50 characters.';
    }
    const tags = form.tags.split(',').map((t) => t.trim()).filter(Boolean);
    if (tags.length > 8) {
      next.tags = 'A blog can have at most 8 tags.';
    } else if (tags.some((t) => t.length > 30)) {
      next.tags = 'Each tag must be at most 30 characters.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const buildFormData = (status) => {
    const formData = new FormData();
    formData.append('title', form.title.trim());
    formData.append('excerpt', form.excerpt.trim());
    formData.append('category', form.category.trim());
    formData.append('content', form.content);
    const tags = form.tags.split(',').map((t) => t.trim()).filter(Boolean);
    formData.append('tags', tags.join(','));
    if (isEdit) {
      // Cover semantics: new file wins; otherwise keep the existing one
      // only if it wasn't removed — sending nothing clears it server-side.
      if (coverFile) {
        formData.append('coverImage', coverFile);
      } else if (existingCover) {
        formData.append('existingCoverImage', JSON.stringify(existingCover));
      }
    } else {
      formData.append('status', status);
      if (coverFile) {
        formData.append('coverImage', coverFile);
      }
    }
    return formData;
  };

  const handleSubmit = async (status) => {
    setFormError('');
    if (!validate()) return;

    setSaving(true);
    try {
      if (isEdit) {
        await blogService.updateBlog(id, buildFormData());
        toast('Blog updated.');
      } else {
        await blogService.createBlog(buildFormData(status));
        toast(status === 'published' ? 'Blog published.' : 'Blog saved as draft.');
      }
      navigate('/admin/blog');
    } catch (err) {
      setFormError(err.message);
      if (err.errors) {
        setErrors((prev) => ({ ...prev, ...err.errors }));
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner size="lg" label="Loading blog" />
      </div>
    );
  }

  if (loadError) {
    return (
      <EmptyState
        title="Blog not found"
        message={loadError}
        action={
          <Link to="/admin/blog" className={buttonStyles({ variant: 'primary', size: 'sm' })}>
            Back to Blogs
          </Link>
        }
      />
    );
  }

  const shownCover = coverPreview || existingCover?.url || '';

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            {isEdit ? 'Edit Blog' : 'New Blog'}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            {isEdit ? 'Changes are saved without changing the publish status.' : 'Write the article, then save it as a draft or publish it immediately.'}
          </p>
        </div>
        <Link to="/admin/blog" className={buttonStyles({ variant: 'outline', size: 'sm' })}>
          ← Back to Blogs
        </Link>
      </div>

      <form className="mt-6 space-y-6" noValidate onSubmit={(event) => event.preventDefault()}>
        <FormError message={formError} />

        <FormInput
          label="Title"
          id="blog-title"
          type="text"
          required
          maxLength={150}
          placeholder="e.g. A Beginner's Guide to Caring for Your First Dog"
          value={form.title}
          onChange={(event) => setField('title', event.target.value)}
          error={errors.title}
        />

        <FormInput
          label="Excerpt"
          id="blog-excerpt"
          type="text"
          required
          maxLength={300}
          hint="A short summary shown on cards and search results (10–300 characters)."
          placeholder="One or two sentences summarising the article"
          value={form.excerpt}
          onChange={(event) => setField('excerpt', event.target.value)}
          error={errors.excerpt}
        />

        <div className="grid gap-6 sm:grid-cols-2">
          <FormInput
            label="Category"
            id="blog-category"
            type="text"
            maxLength={50}
            placeholder="e.g. Pet Care"
            value={form.category}
            onChange={(event) => setField('category', event.target.value)}
            error={errors.category}
          />
          <FormInput
            label="Tags"
            id="blog-tags"
            type="text"
            hint="Comma-separated, up to 8 tags."
            placeholder="dogs, nutrition, guide"
            value={form.tags}
            onChange={(event) => setField('tags', event.target.value)}
            error={errors.tags}
          />
        </div>

        {/* Cover image */}
        <div>
          <label htmlFor="blog-cover" className="block text-sm font-medium text-gray-700">
            Cover image
          </label>
          {shownCover ? (
            <div className="mt-2 flex items-start gap-4">
              <ImageWithFallback
                src={shownCover}
                alt="Cover preview"
                className="aspect-[16/9] w-48 rounded-lg border border-gray-200 object-cover"
              />
              <Button variant="ghost" size="sm" onClick={clearCover}>
                Remove
              </Button>
            </div>
          ) : (
            <input
              id="blog-cover"
              type="file"
              accept="image/*"
              onChange={handleCoverSelect}
              className="mt-1 block w-full cursor-pointer rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-500 file:mr-4 file:cursor-pointer file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-brand-800 hover:file:bg-brand-100"
            />
          )}
          {errors.coverImage && <p className="mt-1.5 text-sm text-red-600">{errors.coverImage}</p>}
        </div>

        {/* Rich text content */}
        <div>
          <span className="block text-sm font-medium text-gray-700">
            Content <span className="text-red-600" aria-hidden="true">*</span>
          </span>
          <p className="mt-0.5 text-sm text-gray-500">
            Use the toolbar for headings, lists, links, and images. HTML is sanitized before saving.
          </p>
          <div className="mt-2">
            <RichTextEditor
              key={id ?? 'new'}
              value={form.content}
              onChange={(html) => setField('content', html)}
            />
          </div>
          {errors.content && (
            <p role="alert" className="mt-1.5 text-sm text-red-600">
              {errors.content}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-3 border-t border-gray-200 pt-6">
          {isEdit ? (
            <Button variant="primary" loading={saving} disabled={saving} onClick={() => handleSubmit()}>
              Save Changes
            </Button>
          ) : (
            <>
              <Button variant="outline" loading={saving} disabled={saving} onClick={() => handleSubmit('draft')}>
                Save as Draft
              </Button>
              <Button variant="primary" loading={saving} disabled={saving} onClick={() => handleSubmit('published')}>
                Publish Now
              </Button>
            </>
          )}
        </div>
      </form>
    </section>
  );
}
