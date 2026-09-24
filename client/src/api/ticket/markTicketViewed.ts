import { ticketViewPath } from '~/api';
import http from '~/services/http';
import clearTicketUnreadInListCaches from '~/api/ticket/clearTicketUnreadInListCaches';

/** Marks the ticket as viewed for the current user and clears list unread highlights. */
async function markTicketViewed(ticketId: string) {
  await http.post(ticketViewPath(ticketId));
  await clearTicketUnreadInListCaches(ticketId);
}

export default markTicketViewed;
