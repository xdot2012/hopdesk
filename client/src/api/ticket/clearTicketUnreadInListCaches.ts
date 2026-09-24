import { mutate } from 'swr';

import { TICKET_PATH } from '~/api';
import type { TicketListPage } from '~/api/ticket/listTickets';

type TicketListCache = {
  data: TicketListPage;
  status: number;
};

function isTicketListKey(key: unknown): key is string {
  return typeof key === 'string' && (key === TICKET_PATH || key.startsWith(`${TICKET_PATH}?`));
}

/** Clears unread highlight in cached ticket lists after the user opens a ticket. */
function clearTicketUnreadInListCaches(ticketId: string) {
  return mutate(
    isTicketListKey,
    (current: TicketListCache | undefined) => {
      if (!current?.data?.items) return current;
      return {
        ...current,
        data: {
          ...current.data,
          items: current.data.items.map((item) =>
            item.id === ticketId ? { ...item, hasUnreadUpdate: false } : item,
          ),
        },
      };
    },
    { revalidate: false },
  );
}

export default clearTicketUnreadInListCaches;
