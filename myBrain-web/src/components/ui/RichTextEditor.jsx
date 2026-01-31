// PLANNED FEATURE: Rich text editing for Notes and Knowledge Base
// This component provides a full TipTap-based editor with formatting toolbar.
// Intended for use when notes/KB need rich text support beyond plain text.
// Dependencies: @tiptap/react, @tiptap/starter-kit, @tiptap/extension-placeholder,
//               @tiptap/extension-link, dompurify

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import DOMPurify from 'dompurify';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon,
  Heading2,
  Quote,
  Undo,
  Redo,
  Code
} from 'lucide-react';

/**
 * RichTextEditor - TipTap-based rich text editor
 *
 * Features:
 * - Bold, Italic, Strikethrough
 * - Headings, Blockquotes, Code
 * - Bullet and Ordered Lists
 * - Links
 * - Undo/Redo
 *
 * Props:
 * - value: HTML string
 * - onChange: (html: string) => void
 * - placeholder: string
 * - minHeight: number (default: 120)
 * - disabled: boolean
 * - toolbar: 'minimal' | 'standard' | 'full' (default: 'standard')
 *
 * IMPORTANT: This component should be lazy loaded:
 * const RichTextEditor = lazy(() => import('./RichTextEditor'));
 */
function RichTextEditor({
  value = '',
  onChange,
  placeholder = 'Start typing...',
  minHeight = 120,
  disabled = false,
  toolbar = 'standard',
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline',
        },
      }),
    ],
    content: value ? DOMPurify.sanitize(value) : '',
    editable: !disabled,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      // Don't sanitize on save - preserves content
      // Sanitization happens on render
      onChange?.(html);
    },
  });

  // Note: External value sync is handled by useEditor's content prop on mount.
  // For subsequent external changes, we intentionally don't sync to avoid
  // infinite loops. The editor is the source of truth after mount.

  if (!editor) {
    return (
      <div
        className="bg-bg border border-border rounded-lg animate-pulse"
        style={{ minHeight }}
      />
    );
  }

  const addLink = () => {
    const url = window.prompt('Enter URL:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  // Toolbar button component
  const ToolbarButton = ({ onClick, isActive, disabled: btnDisabled, children, title }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={btnDisabled || disabled}
      title={title}
      className={`p-1.5 rounded transition-colors ${
        isActive
          ? 'bg-primary/20 text-primary'
          : 'text-muted hover:text-text hover:bg-bg'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );

  return (
    <div className={`rich-text-editor border border-border rounded-lg overflow-hidden ${disabled ? 'opacity-60' : ''}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 p-2 border-b border-border bg-panel flex-wrap">
        {/* Text formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Italic (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </ToolbarButton>

        {toolbar !== 'minimal' && (
          <>
            <div className="w-px h-4 bg-border mx-1" />

            {/* Headings */}
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              isActive={editor.isActive('heading', { level: 2 })}
              title="Heading"
            >
              <Heading2 className="w-4 h-4" />
            </ToolbarButton>

            {/* Quote */}
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              isActive={editor.isActive('blockquote')}
              title="Quote"
            >
              <Quote className="w-4 h-4" />
            </ToolbarButton>

            {/* Code */}
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleCode().run()}
              isActive={editor.isActive('code')}
              title="Code"
            >
              <Code className="w-4 h-4" />
            </ToolbarButton>

            <div className="w-px h-4 bg-border mx-1" />

            {/* Lists */}
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive('bulletList')}
              title="Bullet List"
            >
              <List className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={editor.isActive('orderedList')}
              title="Numbered List"
            >
              <ListOrdered className="w-4 h-4" />
            </ToolbarButton>

            <div className="w-px h-4 bg-border mx-1" />

            {/* Link */}
            <ToolbarButton
              onClick={addLink}
              isActive={editor.isActive('link')}
              title="Add Link"
            >
              <LinkIcon className="w-4 h-4" />
            </ToolbarButton>
          </>
        )}

        {toolbar === 'full' && (
          <>
            <div className="flex-1" />

            {/* Undo/Redo */}
            <ToolbarButton
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              title="Undo (Ctrl+Z)"
            >
              <Undo className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              title="Redo (Ctrl+Y)"
            >
              <Redo className="w-4 h-4" />
            </ToolbarButton>
          </>
        )}
      </div>

      {/* Editor content */}
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none p-3 focus:outline-none"
        style={{ minHeight }}
      />

      {/* Editor styles */}
      <style>{`
        .ProseMirror {
          outline: none;
          min-height: ${minHeight}px;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: var(--color-muted);
          pointer-events: none;
          height: 0;
        }
        .ProseMirror h2 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
        }
        .ProseMirror h3 {
          font-size: 1.1rem;
          font-weight: 600;
          margin-top: 0.75rem;
          margin-bottom: 0.5rem;
        }
        .ProseMirror blockquote {
          border-left: 3px solid var(--color-border);
          padding-left: 1rem;
          margin: 0.5rem 0;
          color: var(--color-muted);
        }
        .ProseMirror code {
          background: var(--color-bg);
          padding: 0.2rem 0.4rem;
          border-radius: 0.25rem;
          font-size: 0.875rem;
        }
        .ProseMirror ul, .ProseMirror ol {
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }
        .ProseMirror li {
          margin: 0.25rem 0;
        }
        .ProseMirror a {
          color: var(--color-primary);
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}

export default RichTextEditor;
