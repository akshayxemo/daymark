'use client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Renders user-authored Markdown as React elements. Raw HTML is never
 * interpreted and unsafe link protocols are dropped, so content can be shown
 * without any sanitizer.
 */
export function Markdown({ content, className = '' }: { content: string; className?: string }) {
  if (!content.trim()) return null;
  return (
    <div className={`markdown ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer nofollow">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
