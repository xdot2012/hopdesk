import {
  TICKET_ASSIGNEE_OPTIONS_PATH,
  TICKET_MENTION_OPTIONS_PATH,
  TICKET_REQUESTER_OPTIONS_PATH,
} from '~/api';

export const TICKET_FILTER_USER_PAGE_SIZE = 20;

export type TicketFilterUserOption = {
  id: string;
  name?: string | null;
  email: string;
};

export type TicketFilterUserPage = {
  items: TicketFilterUserOption[];
  total: number;
  page: number;
  size: number;
  pages: number;
};

export type SearchTicketFilterUsersParams = {
  search?: string;
  page?: number;
  size?: number;
};

function buildSearchTicketFilterUsersUrl(
  basePath: string,
  params: SearchTicketFilterUsersParams = {},
) {
  const search = new URLSearchParams();
  const query = params.search?.trim();
  if (query) search.set('search', query);
  if (params.page && params.page > 1) search.set('page', String(params.page));
  if (params.size && params.size !== TICKET_FILTER_USER_PAGE_SIZE) {
    search.set('size', String(params.size));
  }
  const suffix = search.toString();
  return suffix ? `${basePath}?${suffix}` : basePath;
}

function buildSearchAssigneeOptionsUrl(params: SearchTicketFilterUsersParams = {}) {
  return buildSearchTicketFilterUsersUrl(TICKET_ASSIGNEE_OPTIONS_PATH, params);
}

function buildSearchRequesterOptionsUrl(params: SearchTicketFilterUsersParams = {}) {
  return buildSearchTicketFilterUsersUrl(TICKET_REQUESTER_OPTIONS_PATH, params);
}

function buildSearchMentionOptionsUrl(params: SearchTicketFilterUsersParams = {}) {
  return buildSearchTicketFilterUsersUrl(TICKET_MENTION_OPTIONS_PATH, params);
}

export function ticketFilterUserLabel(
  user: Pick<TicketFilterUserOption, 'name' | 'email' | 'id'>,
) {
  const trimmed = user.name?.trim();
  if (trimmed && !trimmed.includes('@')) return trimmed;
  if (user.email) return user.email;
  return user.id;
}

export {
  buildSearchAssigneeOptionsUrl,
  buildSearchRequesterOptionsUrl,
  buildSearchMentionOptionsUrl,
  buildSearchTicketFilterUsersUrl,
};
