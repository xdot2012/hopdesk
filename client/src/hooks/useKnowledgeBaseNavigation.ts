import { useCallback, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

export type KnowledgeBaseDialogMode = 'browse' | 'new';

/** Query params that open the KB dialog over the current page. */
export const KB_PARAM = 'kb';
export const KB_PARENT_PARAM = 'kbParent';
export const KB_Q_PARAM = 'kbQ';

export const KB_HOME_VALUE = 'home';
export const KB_NEW_VALUE = 'new';

function clearKbParams(params: URLSearchParams) {
  params.delete(KB_PARAM);
  params.delete(KB_PARENT_PARAM);
  params.delete(KB_Q_PARAM);
}

export default function useKnowledgeBaseNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const kbValue = searchParams.get(KB_PARAM);
  const isOpen = Boolean(kbValue);
  const mode: KnowledgeBaseDialogMode = kbValue === KB_NEW_VALUE ? 'new' : 'browse';
  const articleRef =
    kbValue && kbValue !== KB_HOME_VALUE && kbValue !== KB_NEW_VALUE ? kbValue : null;
  const searchQuery = searchParams.get(KB_Q_PARAM);
  const parentId = searchParams.get(KB_PARENT_PARAM);

  const patchLocationSearch = useCallback(
    (mutate: (params: URLSearchParams) => void, replace: boolean) => {
      const params = new URLSearchParams(location.search);
      mutate(params);
      const search = params.toString();
      navigate(
        {
          pathname: location.pathname,
          search: search ? `?${search}` : '',
          hash: location.hash,
        },
        { replace },
      );
    },
    [location.hash, location.pathname, location.search, navigate],
  );

  const openKnowledgeBase = useCallback(
    (options?: { searchQuery?: string | null }) => {
      const trimmed = options?.searchQuery?.trim();
      patchLocationSearch((params) => {
        clearKbParams(params);
        params.set(KB_PARAM, KB_HOME_VALUE);
        if (trimmed) params.set(KB_Q_PARAM, trimmed);
      }, false);
    },
    [patchLocationSearch],
  );

  const openArticle = useCallback(
    (idOrSlug: string, options?: { replace?: boolean }) => {
      const wasOpen = Boolean(new URLSearchParams(location.search).get(KB_PARAM));
      patchLocationSearch((params) => {
        clearKbParams(params);
        params.set(KB_PARAM, idOrSlug);
      }, options?.replace ?? wasOpen);
    },
    [location.search, patchLocationSearch],
  );

  const openNewArticle = useCallback(
    (nextParentId?: string | null) => {
      const wasOpen = Boolean(new URLSearchParams(location.search).get(KB_PARAM));
      patchLocationSearch((params) => {
        clearKbParams(params);
        params.set(KB_PARAM, KB_NEW_VALUE);
        if (nextParentId) params.set(KB_PARENT_PARAM, nextParentId);
      }, wasOpen);
    },
    [location.search, patchLocationSearch],
  );

  const goHome = useCallback(() => {
    patchLocationSearch((params) => {
      clearKbParams(params);
      params.set(KB_PARAM, KB_HOME_VALUE);
    }, true);
  }, [patchLocationSearch]);

  const closeKnowledgeBase = useCallback(() => {
    patchLocationSearch((params) => {
      clearKbParams(params);
    }, true);
  }, [patchLocationSearch]);

  return useMemo(
    () => ({
      isOpen,
      mode,
      articleRef,
      searchQuery,
      parentId,
      openKnowledgeBase,
      openArticle,
      openNewArticle,
      goHome,
      closeKnowledgeBase,
    }),
    [
      articleRef,
      closeKnowledgeBase,
      goHome,
      isOpen,
      mode,
      openArticle,
      openKnowledgeBase,
      openNewArticle,
      parentId,
      searchQuery,
    ],
  );
}
