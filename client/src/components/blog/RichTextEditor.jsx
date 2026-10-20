import { useCallback, useRef } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Spinner from '../common/Spinner.jsx';
import { blogService } from '../../services/blogService.js';
import { useToast } from '../../context/ToastContext.jsx';

const MAX_IMAGE_MB = 2;

/**
 * TipTap rich text editor with a simple toolbar.
 * Emits sanitized-at-render HTML via onChange(editor.getHTML());
 * inline images upload through the admin upload endpoint.
 */
export default function RichTextEditor({ value, onChange, placeholder }) {
  const { toast } = useToast();
  const fileInputRef = useRef(null);
  const uploadingRef = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Image.configure({ inline: false, allowBase64: false }),
    ],
    content: value || '',
    onUpdate: ({ editor: current }) => onChange(current.getHTML()),
    editorProps: {
      attributes: {
        class:
          'prose prose-gray max-w-none min-h-[300px] focus:outline-none px-4 py-3 prose-headings:font-bold prose-img:rounded-xl',
        ...(placeholder ? { 'data-placeholder': placeholder } : {}),
      },
    },
  });

  const setLink = useCallback(() => {
    if (!editor) return;
    const previous = editor.getAttributes('link').href;
    const url = window.prompt('Link URL (https://…)', previous ?? 'https://');
    // Cancelled — leave the selection untouched.
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const handleImageSelect = useCallback(
    async (event) => {
      const file = event.target.files?.[0];
      event.target.value = ''; // allow re-selecting the same file
      if (!file || !editor) return;

      if (!file.type.startsWith('image/')) {
        toast('Please select an image file.', 'error');
        return;
      }
      if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
        toast(`Image must be smaller than ${MAX_IMAGE_MB} MB.`, 'error');
        return;
      }

      uploadingRef.current = true;
      try {
        const { url } = await blogService.uploadImage(file);
        editor.chain().focus().setImage({ src: url }).run();
      } catch (err) {
        toast(err.message || 'Image upload failed.', 'error');
      } finally {
        uploadingRef.current = false;
      }
    },
    [editor, toast]
  );

  if (!editor) {
    return (
      <div className="flex h-[364px] items-center justify-center rounded-lg border border-gray-300 bg-gray-50">
        <Spinner size="lg" />
      </div>
    );
  }

  const ToolbarButton = ({ label, title, onClick, active, disabled }) => (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onClick={onClick}
      disabled={disabled}
      className={`h-8 min-w-8 rounded px-2 text-sm font-medium transition-colors ${
        active
          ? 'bg-brand-100 text-brand-800'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      } disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {label}
    </button>
  );

  return (
    <div className="overflow-hidden rounded-lg border border-gray-300 bg-white focus-within:border-brand-700 focus-within:ring-2 focus-within:ring-brand-700/20">
      <div
        role="toolbar"
        aria-label="Formatting"
        className="flex flex-wrap items-center gap-1 border-b border-gray-200 bg-gray-50 px-2 py-1.5"
      >
        <ToolbarButton
          label="B"
          title="Bold"
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
        />
        <ToolbarButton
          label="I"
          title="Italic"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
        />
        <ToolbarButton
          label="H2"
          title="Heading 2"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
        />
        <ToolbarButton
          label="H3"
          title="Heading 3"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive('heading', { level: 3 })}
        />
        <span className="mx-1 h-5 w-px bg-gray-200" aria-hidden="true" />
        <ToolbarButton
          label="•"
          title="Bullet list"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
        />
        <ToolbarButton
          label="1."
          title="Numbered list"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
        />
        <ToolbarButton
          label="❝"
          title="Blockquote"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
        />
        <span className="mx-1 h-5 w-px bg-gray-200" aria-hidden="true" />
        <ToolbarButton
          label="🔗"
          title="Add or edit link"
          onClick={setLink}
          active={editor.isActive('link')}
        />
        <ToolbarButton
          label="🖼"
          title="Insert image"
          onClick={() => fileInputRef.current?.click()}
        />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageSelect}
      />

      <EditorContent editor={editor} />
    </div>
  );
}
