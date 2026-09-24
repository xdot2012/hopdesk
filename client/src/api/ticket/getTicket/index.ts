import { ticketDetailPath } from '~/api';
import useImmutableQuery from '~/hooks/useImmutableQuery';
import type { TicketDetail } from '../types';

function useGetTicket(ticketId: string | undefined) {
  const { data, ...rest } = useImmutableQuery<TicketDetail>(
    ticketId ? ticketDetailPath(ticketId) : null,
    { method: 'get' },
  );
  return { ticket: data?.data, ...rest };
}

export default useGetTicket;
