import React, { useRef, useCallback } from 'react';
import { Button } from './button';
import { Bold, Italic, Underline, List, ListOrdered } from 'lucide-react';

const RichTextEditor = ({ value, onChange, placeholder, className = '' }) => {
  const editorRef = useRef(null);

  const execCommand = useCallback((command, value = null) => {
    document.execCommand(command, false, value);
    // Trigger onChange with the updated content
    if (editorRef.current && onChange) {
      onChange(editorRef.current.innerHTML);
    }
    editorRef.current?.focus();
  }, [onChange]);

  const handleInput = useCallback(() => {
    if (editorRef.current && onChange) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const handlePaste = useCallback((e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  }, []);

  return (
    <div className={`border rounded-md overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b bg-slate-50">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand('bold')}
          className="h-8 w-8 p-0"
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand('italic')}
          className="h-8 w-8 p-0"
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand('underline')}
          className="h-8 w-8 p-0"
          title="Underline"
        >
          <Underline className="w-4 h-4" />
        </Button>
        <div className="w-px h-6 bg-slate-200 mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand('insertUnorderedList')}
          className="h-8 w-8 p-0"
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand('insertOrderedList')}
          className="h-8 w-8 p-0"
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </Button>
      </div>
      
      {/* Editor Area */}
      <div
        ref={editorRef}
        contentEditable
        className="min-h-[200px] p-3 outline-none prose prose-sm max-w-none"
        onInput={handleInput}
        onPaste={handlePaste}
        dangerouslySetInnerHTML={{ __html: value || '' }}
        data-placeholder={placeholder}
        style={{
          minHeight: '200px',
        }}
      />
      
      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
        [contenteditable] ul, [contenteditable] ol {
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }
        [contenteditable] li {
          margin: 0.25rem 0;
        }
      `}</style>
    </div>
  );
};

export { RichTextEditor };
