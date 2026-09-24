import { TICKET_PRIORITIES_PATH } from '~/api';
import useImmutableQuery from '~/hooks/useImmutableQuery';
import type { TicketPriority } from '../types';

function useListPriorities() {
  const { data, ...rest } = useImmutableQuery<TicketPriority[]>(TICKET_PRIORITIES_PATH, {
    method: 'get',
  });
  return { priorities: data?.data ?? [], ...rest };
}

export default useListPriorities;
