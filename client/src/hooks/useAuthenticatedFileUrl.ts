import { useEffect, useState } from 'react';
import {
  fetchAuthenticatedFileBlobUrl,
  isAppFileUrl,
} from '~/lib/authenticatedFiles';

/**
 * Resolves app file URLs (`/v1/files/...`) to blob: URLs with Bearer auth.
 * Non-app URLs (blob/data/external) are returned as-is.
 * Blob URLs are cached globally — do not revoke per-component.
 */
export default function useAuthenticatedFileUrl(
  src: string | null | undefined,
): string | null {
  const [resolved, setResolved] = useState<string | null>(() =>
    src && !isAppFileUrl(src) ? src : null,
  );

  useEffect(() => {
    if (!src) {
      setResolved(null);
      return;
    }
    if (!isAppFileUrl(src)) {
      setResolved(src);
      return;
    }

    let cancelled = false;
    setResolved(null);
    fetchAuthenticatedFileBlobUrl(src)
      .then((url) => {
        if (!cancelled) setResolved(url);
      })
      .catch(() => {
        if (!cancelled) setResolved(null);
      });

    return () => {
      cancelled = true;
    };
  }, [src]);

  return resolved;
}
