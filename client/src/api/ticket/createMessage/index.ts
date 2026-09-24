import { ticketMessagesPath } from '~/api';
import http from '~/services/http';
import useMutation from '~/hooks/useMutation';
import type { TicketDetail } from '../types';

export type CreateTicketMessagePayload = {
  body: string;
  visibility?: string;
  customerPending?: boolean;
  attachments?: Array<{
    key: string;
    originalFilename: string;
    contentType: string;
    size: number;
  }>;
};

export async function createTicketMessage(ticketId: string, payload: CreateTicketMessagePayload) {
  const { data } = await http.post<TicketDetail>(ticketMessagesPath(ticketId), payload);
  return data;
}

function useCreateTicketMessage(ticketId: string) {
  return useMutation<CreateTicketMessagePayload, TicketDetail>(ticketMessagesPath(ticketId), {
    method: 'post',
  });
}

export default useCreateTicketMessage;
