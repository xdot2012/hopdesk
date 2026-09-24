import { mutate } from 'swr';

import { ticketDetailPath } from '~/api';
import http from '~/services/http';

/** Refetch a ticket detail response and push it into the SWR cache. */
async function refreshTicketDetailCache(ticketId: string) {
  const key = ticketDetailPath(ticketId);
  const response = await http.get(key);
  await mutate(key, { data: response.data, status: response.status }, { revalidate: false });
}

export default refreshTicketDetailCache;
