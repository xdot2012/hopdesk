import { useEffect, useRef } from 'react';
import { rewriteAuthenticatedImages } from '~/lib/authenticatedFiles';
import { looksLikeHtml } from '~/lib/richText';
import { cn } from '~/lib/utils';

type RichTextViewerProps = {
  html: string;
  className?: string;
};

export default function RichTextViewer({ html, className }: RichTextViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = containerRef.current;
    if (!root || !looksLikeHtml(html)) return;
    void rewriteAuthenticatedImages(root);
  }, [html]);

  if (!looksLikeHtml(html)) {
    return (
      <div className={cn('whitespace-pre-wrap text-sm leading-relaxed', className)}>
        {html}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'rich-text-content max-w-none text-sm leading-relaxed',
        '[&_h1]:mb-3 [&_h1]:text-xl [&_h1]:font-bold',
        '[&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold',
        '[&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-semibold',
        '[&_p]:mb-3 [&_p:last-child]:mb-0',
        '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5',
        '[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5',
        '[&_li]:my-0.5',
        '[&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground',
        '[&_a]:break-all [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2',
        '[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs',
        '[&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-xs',
        '[&_img]:my-4 max-h-[480px] max-w-full rounded-lg object-contain',
        '[&_iframe]:my-4 max-w-full rounded-lg border-0',
        '[&_mark]:rounded-sm [&_mark]:px-0.5',
        '[&_u]:underline',
        '[&_s]:line-through',
        '[&_[data-youtube-video]]:my-4 [&_[data-youtube-video]_iframe]:max-w-full',
        '[&_.mention]:rounded [&_.mention]:bg-primary/15 [&_.mention]:px-1 [&_.mention]:font-semibold [&_.mention]:text-primary',
        className,
      )}
      // Body is sanitized on the API (nh3) before persistence/read.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
