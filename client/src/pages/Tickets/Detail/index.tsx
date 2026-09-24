import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DASHBOARD, TICKETS } from '~/router/paths';
import { useTicketDetailDialogStore, useUserStore } from '~/store';
import { isCustomerRole } from '~/util/roles';

/** Deep link /tickets/:id — abre o modal e volta à lista (ou ao painel do cliente). */
export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, isProfileSet } = useUserStore();
  const openTicket = useTicketDetailDialogStore((state) => state.openTicket);
  const customer = isProfileSet && isCustomerRole(profile?.role);

  useEffect(() => {
    if (!isProfileSet || !id) return;
    openTicket(id);
    navigate(customer ? DASHBOARD : TICKETS, { replace: true });
  }, [customer, id, isProfileSet, navigate, openTicket]);

  return null;
}
