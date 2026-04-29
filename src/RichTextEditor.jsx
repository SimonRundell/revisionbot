import { useEffect, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import { sanitizeRichText } from './utils/richText';

function ToolbarButton({ editor, onClick, label, iconClass, isActive, disabled = false }) {
  return (
    <button
      type="button"
      className={`rich-text-toolbar-button${isActive ? ' is-active' : ''}`}
      onClick={onClick}
      disabled={disabled || !editor}
      aria-label={label}
      title={label}
    >
      <i className={iconClass} aria-hidden="true" />
    </button>
  );
}

const BLOCKED_TIMEOUT = 1200;

function RichTextEditor({ value, onChange, placeholder, minHeight = 180, theme = 'dark', blockPaste = false }) {
  const [blockedMsg, setBlockedMsg] = useState('');

  const showBlocked = (msg) => {
    setBlockedMsg(msg);
    setTimeout(() => setBlockedMsg(''), BLOCKED_TIMEOUT);
  };

  const pasteBlockProps = blockPaste ? {
    handleDOMEvents: {
      copy:        (_, e) => { e.preventDefault(); showBlocked('Copying is not allowed'); return true; },
      cut:         (_, e) => { e.preventDefault(); showBlocked('Cutting is not allowed');  return true; },
      paste:       (_, e) => { e.preventDefault(); showBlocked('Pasting is not allowed');  return true; },
      drop:        (_, e) => { e.preventDefault(); showBlocked('Dropping is not allowed'); return true; },
      contextmenu: ()     => { showBlocked('Right-click is not allowed'); return false; },
    },
    handlePaste: () => true,
    handleDrop:  () => true,
    handleKeyDown: (view, e) => {
      // Allow Tab key for indentation
      if (e.key === 'Tab') {
        e.preventDefault();
        view.dispatch(view.state.tr.insertText('\t'));
        return true;
      }
      // Block paste shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        showBlocked('Pasting is not allowed');
        return true;
      }
      return false;
    },
  } : {
    handleKeyDown: (view, e) => {
      // Allow Tab key for indentation even when paste blocking is off
      if (e.key === 'Tab') {
        e.preventDefault();
        view.dispatch(view.state.tr.insertText('\t'));
        return true;
      }
      return false;
    },
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content: sanitizeRichText(value || ''),
    onUpdate: ({ editor: currentEditor }) => {
      onChange(sanitizeRichText(currentEditor.getHTML()));
    },
    editorProps: {
      attributes: {
        class: 'rich-text-editor-surface',
      },
      ...pasteBlockProps,
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    const nextValue = sanitizeRichText(value || '');
    if (editor.getHTML() !== nextValue) {
      editor.commands.setContent(nextValue || '', false);
    }
  }, [editor, value]);

  return (
    <div className={`rich-text-editor rich-text-editor--${theme}`} style={{ '--rich-text-min-height': `${minHeight}px` }}>
      <div className="rich-text-toolbar">
        <ToolbarButton
          editor={editor}
          label="Normal text"
          iconClass="fa-solid fa-paragraph"
          onClick={() => editor.chain().focus().setParagraph().run()}
          isActive={editor?.isActive('paragraph')}
        />
        <ToolbarButton
          editor={editor}
          label="Bold"
          iconClass="fa-solid fa-bold"
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor?.isActive('bold')}
        />
        <ToolbarButton
          editor={editor}
          label="Italic"
          iconClass="fa-solid fa-italic"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor?.isActive('italic')}
        />
        <ToolbarButton
          editor={editor}
          label="Underline"
          iconClass="fa-solid fa-underline"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor?.isActive('underline')}
        />
        <ToolbarButton
          editor={editor}
          label="Unordered list"
          iconClass="fa-solid fa-list-ul"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor?.isActive('bulletList')}
        />
        <ToolbarButton
          editor={editor}
          label="Ordered list"
          iconClass="fa-solid fa-list-ol"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor?.isActive('orderedList')}
        />
        <ToolbarButton
          editor={editor}
          label="Code"
          iconClass="fa-solid fa-code"
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor?.isActive('code')}
        />
        <ToolbarButton
          editor={editor}
          label="Blockquote"
          iconClass="fa-solid fa-quote-right"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor?.isActive('blockquote')}
        />
        <ToolbarButton
          editor={editor}
          label="Undo"
          iconClass="fa-solid fa-rotate-left"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor?.can().chain().focus().undo().run()}
        />
        <ToolbarButton
          editor={editor}
          label="Redo"
          iconClass="fa-solid fa-rotate-right"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor?.can().chain().focus().redo().run()}
        />
      </div>
      {blockedMsg && <div className="rich-text-blocked-msg">{blockedMsg}</div>}
      <EditorContent editor={editor} />
    </div>
  );
}

export default RichTextEditor;