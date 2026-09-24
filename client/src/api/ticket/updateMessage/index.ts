import { ticketMessagePath } from '~/api';
import useSWRMutation from 'swr/mutation';
import http from '~/services/http';
import type { TicketDetail } from '../types';

export type UpdateTicketMessagePayload = {
  messageId: string;
  body: string;
};

function useUpdateTicketMessage(ticketId: string) {
  return useSWRMutation(
    `ticket-update-message-${ticketId}`,
    async (_key: string, { arg }: { arg: UpdateTicketMessagePayload }) => {
      const response = await http.patch<TicketDetail>(
        ticketMessagePath(ticketId, arg.messageId),
        { body: arg.body },
      );
      return { data: response.data, status: response.status };
    },
  );
}

export default useUpdateTicketMessage;
