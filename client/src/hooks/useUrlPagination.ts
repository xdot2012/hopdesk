import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

type UseUrlPaginationOptions = {
  /** Query param name (1-based page number in the URL). */
  param?: string;
  defaultPage?: number;
};

function parsePage(raw: string | null, defaultPage: number): number {
  if (!raw) return defaultPage;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return defaultPage;
  return parsed;
}

export default function useUrlPagination(options: UseUrlPaginationOptions = {}) {
  const { param = 'page', defaultPage = 1 } = options;
  const [searchParams, setSearchParams] = useSearchParams();

  const page = useMemo(
    () => parsePage(searchParams.get(param), defaultPage),
    [searchParams, param, defaultPage],
  );

  const pageIndex = page - 1;

  const setPage = useCallback(
    (nextPage: number) => {
      const safePage = Math.max(1, Math.trunc(nextPage));
      const params = new URLSearchParams(searchParams);
      if (safePage <= 1) {
        params.delete(param);
      } else {
        params.set(param, String(safePage));
      }
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams, param],
  );

  const setPageIndex = useCallback(
    (nextIndex: number) => setPage(nextIndex + 1),
    [setPage],
  );

  const resetPage = useCallback(() => setPage(defaultPage), [setPage, defaultPage]);

  return { page, pageIndex, setPage, setPageIndex, resetPage };
}
