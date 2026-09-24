import http from '~/services/http';
import { FILES_BASE_URL, resolveFileUrl } from '~/lib/files';

const blobUrlCache = new Map<string, string>();

export function isAppFileUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  if (url.startsWith('blob:') || url.startsWith('data:')) return false;
  if (url.startsWith('/v1/files/')) return true;
  if (url.startsWith(`${FILES_BASE_URL}/`)) return true;
  if (
    !url.startsWith('http://') &&
    !url.startsWith('https://') &&
    (url.startsWith('avatars/') ||
      url.startsWith('ticket-attachments/') ||
      url.startsWith('knowledge-base/'))
  ) {
    return true;
  }
  return false;
}

export function toFileRequestUrl(urlOrKey: string): string {
  const resolved = resolveFileUrl(urlOrKey) || urlOrKey;
  if (resolved.startsWith('http://') || resolved.startsWith('https://')) {
    return resolved;
  }
  if (resolved.startsWith('/')) {
    return resolved;
  }
  return `${FILES_BASE_URL}/${resolved.replace(/^\/+/, '')}`;
}

export async function fetchAuthenticatedFileBlobUrl(urlOrKey: string): Promise<string> {
  const requestUrl = toFileRequestUrl(urlOrKey);
  const cached = blobUrlCache.get(requestUrl);
  if (cached) return cached;

  const { data } = await http.get<Blob>(requestUrl, {
    responseType: 'blob',
  });
  const objectUrl = URL.createObjectURL(data);
  blobUrlCache.set(requestUrl, objectUrl);
  return objectUrl;
}

/**
 * Opens an app file in a new tab (never forces a download).
 * System rule: authenticated file clicks always open inline for viewing.
 */
export async function openAuthenticatedFile(urlOrKey: string): Promise<void> {
  const blobUrl = await fetchAuthenticatedFileBlobUrl(urlOrKey);
  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export async function rewriteAuthenticatedImages(root: ParentNode): Promise<void> {
  const images = Array.from(root.querySelectorAll('img'));

  await Promise.all(
    images.map(async (img) => {
      const src = img.getAttribute('src');
      if (!isAppFileUrl(src)) return;
      try {
        const blobUrl = await fetchAuthenticatedFileBlobUrl(src!);
        if (img.getAttribute('src') === src) {
          img.setAttribute('src', blobUrl);
        }
      } catch {
        // leave original src; browser will fail privately
      }
    }),
  );
}
