import { ticketAssignMePath } from '~/api';
import useMutation from '~/hooks/useMutation';
import type { TicketDetail } from '../types';

function useAssignTicketToMe(ticketId: string) {
  return useMutation<Record<string, never>, TicketDetail>(ticketAssignMePath(ticketId), {
    method: 'post',
  });
}

export default useAssignTicketToMe;
