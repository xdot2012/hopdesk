import { ticketCancelPath } from '~/api';
import useMutation from '~/hooks/useMutation';
import type { TicketDetail } from '../types';

function useCancelTicket(ticketId: string) {
  return useMutation<Record<string, never>, TicketDetail>(ticketCancelPath(ticketId), {
    method: 'post',
  });
}

export default useCancelTicket;
