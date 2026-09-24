import { ticketDetailPath } from '~/api';
import http from '~/services/http';
import useMutation from '~/hooks/useMutation';
import type { TicketDetail } from '../types';

export type UpdateTicketPayload = {
  status?: string;
  priorityId?: string;
  assigneeUserId?: string;
  cause?: string;
  solution?: string;
  solutionInternal?: boolean;
  effortMinutes?: number;
};

export async function updateTicket(ticketId: string, payload: UpdateTicketPayload) {
  const { data } = await http.patch<TicketDetail>(ticketDetailPath(ticketId), payload);
  return data;
}

function useUpdateTicket(ticketId: string) {
  return useMutation<UpdateTicketPayload, TicketDetail>(ticketDetailPath(ticketId), {
    method: 'patch',
  });
}

export default useUpdateTicket;
