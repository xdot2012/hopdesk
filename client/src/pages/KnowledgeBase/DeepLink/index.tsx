import { useEffect } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import AppLoading from '~/components/AppLoading';
import {
  KB_HOME_VALUE,
  KB_NEW_VALUE,
  KB_PARAM,
  KB_PARENT_PARAM,
  KB_Q_PARAM,
} from '~/hooks/useKnowledgeBaseNavigation';
import { DASHBOARD, KNOWLEDGE_BASE, KNOWLEDGE_BASE_NEW, TICKETS } from '~/router/paths';
import { useUserStore } from '~/store';
import { isCustomerRole } from '~/util/roles';

/**
 * Canonical /knowledge-base/* URLs (share / bookmarks) redirect into the
 * overlay query params on the role home, so the shell stays intact.
 */
export default function KnowledgeBaseDeepLinkPage() {
  const { id } = useParams<{ id?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile, isProfileSet } = useUserStore();

  useEffect(() => {
    if (!isProfileSet || !profile) return;

    const next = new URLSearchParams();
    const pathname = location.pathname;
    const isEdit = pathname.endsWith('/edit');

    if (pathname === KNOWLEDGE_BASE_NEW || pathname === `${KNOWLEDGE_BASE}/new`) {
      next.set(KB_PARAM, KB_NEW_VALUE);
      const parentId = searchParams.get('parentId');
      if (parentId) next.set(KB_PARENT_PARAM, parentId);
    } else if (id && id !== 'new') {
      next.set(KB_PARAM, id);
    } else {
      next.set(KB_PARAM, KB_HOME_VALUE);
      const q = searchParams.get('q');
      if (q?.trim()) next.set(KB_Q_PARAM, q.trim());
    }

    // Edit URLs collapse to the article overlay (inline editing).
    if (isEdit && id) {
      next.set(KB_PARAM, id);
      next.delete(KB_PARENT_PARAM);
      next.delete(KB_Q_PARAM);
    }

    const home = isCustomerRole(profile.role) ? DASHBOARD : TICKETS;
    navigate(
      {
        pathname: home,
        search: `?${next.toString()}`,
      },
      { replace: true },
    );
  }, [id, isProfileSet, location.pathname, navigate, profile, searchParams]);

  return <AppLoading className="p-6" />;
}
