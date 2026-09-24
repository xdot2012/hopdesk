const HTML_TAG_RE = /<[a-zA-Z/!?]/;

export function looksLikeHtml(value?: string | null): boolean {
  return Boolean(value && HTML_TAG_RE.test(value));
}

export function stripHtmlToText(html?: string | null): string {
  if (!html) return '';
  if (typeof DOMParser === 'undefined') {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
}

export function isRichTextEmpty(html?: string | null): boolean {
  return stripHtmlToText(html).length === 0;
}
