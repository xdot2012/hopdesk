import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

type UseSearchTabOptions<T extends string> = {
  /** Allowed tab values (first is the default when param is missing/invalid). */
  tabs: readonly T[];
  /** Query param name. Defaults to `tab`. */
  param?: string;
  /**
   * Tab that omits the query param from the URL (cleaner default deep link).
   * Defaults to `tabs[0]`.
   */
  defaultTab?: T;
};

export default function useSearchTab<T extends string>(options: UseSearchTabOptions<T>) {
  const { tabs, param = 'tab', defaultTab = tabs[0] } = options;
  const [searchParams, setSearchParams] = useSearchParams();

  const raw = searchParams.get(param);
  const value: T =
    raw && (tabs as readonly string[]).includes(raw) ? (raw as T) : defaultTab;

  const setTab = useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams);
      if (next === defaultTab) {
        params.delete(param);
      } else {
        params.set(param, next);
      }
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams, param, defaultTab],
  );

  return { value, setTab };
}
