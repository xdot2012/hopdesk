import { ticketMessagePath } from '~/api';
import useSWRMutation from 'swr/mutation';
import http from '~/services/http';
import type { TicketDetail } from '../types';

export type DeleteTicketMessagePayload = {
  messageId: string;
};

function useDeleteTicketMessage(ticketId: string) {
  return useSWRMutation(
    `ticket-delete-message-${ticketId}`,
    async (_key: string, { arg }: { arg: DeleteTicketMessagePayload }) => {
      const response = await http.delete<TicketDetail>(
        ticketMessagePath(ticketId, arg.messageId),
      );
      return { data: response.data, status: response.status };
    },
  );
}

export default useDeleteTicketMessage;
