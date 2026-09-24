import { ticketSatisfactionPath } from '~/api';
import http from '~/services/http';
import useMutation from '~/hooks/useMutation';
import type { TicketDetail } from '../types';

export type RateTicketSatisfactionBody = {
  rating: number;
  comment?: string | null;
};

export async function rateTicketSatisfaction(
  ticketId: string,
  body: RateTicketSatisfactionBody,
) {
  const { data } = await http.post<TicketDetail>(ticketSatisfactionPath(ticketId), body);
  return data;
}

function useRateTicketSatisfaction(ticketId: string) {
  return useMutation<RateTicketSatisfactionBody, TicketDetail>(
    ticketSatisfactionPath(ticketId),
    { method: 'post' },
  );
}

export default useRateTicketSatisfaction;
