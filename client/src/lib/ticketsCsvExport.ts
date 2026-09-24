import {
  buildListTicketsUrl,
  type ListTicketsParams,
  type TicketListPage,
} from '~/api/ticket/listTickets';
import type { TicketListItem } from '~/api/ticket/types';
import { type CsvColumn, toCsv } from '~/lib/csvExport';
import http from '~/services/http';

export const TICKET_EXPORT_PAGE_SIZE = 100;
export const TICKET_EXPORT_MAX_ROWS = 5000;

/** Raw ticket fields useful for external charts and custom measurements. */
export const TICKET_EXPORT_COLUMNS: CsvColumn[] = [
  { key: 'number', header: 'number' },
  { key: 'externalId', header: 'externalId' },
  { key: 'subject', header: 'subject' },
  { key: 'status', header: 'status' },
  { key: 'priorityCode', header: 'priorityCode' },
  { key: 'priorityLabel', header: 'priorityLabel' },
  { key: 'sectorName', header: 'sectorName' },
  { key: 'assigneeName', header: 'assigneeName' },
  { key: 'assigneeEmail', header: 'assigneeEmail' },
  { key: 'requesterName', header: 'requesterName' },
  { key: 'requesterEmail', header: 'requesterEmail' },
  { key: 'slaStatus', header: 'slaStatus' },
  { key: 'responseDueAt', header: 'responseDueAt' },
  { key: 'resolutionDueAt', header: 'resolutionDueAt' },
  { key: 'firstRespondedAt', header: 'firstRespondedAt' },
  { key: 'resolvedAt', header: 'resolvedAt' },
  { key: 'totalHoldSeconds', header: 'totalHoldSeconds' },
  { key: 'awaitingCustomerReply', header: 'awaitingCustomerReply' },
  { key: 'createdAt', header: 'createdAt' },
  { key: 'updatedAt', header: 'updatedAt' },
];

function ticketToExportRow(ticket: TicketListItem): Record<string, unknown> {
  return {
    number: ticket.number,
    externalId: ticket.externalId ?? '',
    subject: ticket.subject,
    status: ticket.status,
    priorityCode: ticket.priorityCode ?? '',
    priorityLabel: ticket.priorityLabel ?? '',
    sectorName: ticket.sectorName ?? '',
    assigneeName: ticket.assigneeName ?? '',
    assigneeEmail: ticket.assigneeEmail ?? '',
    requesterName: ticket.requesterName ?? '',
    requesterEmail: ticket.requesterEmail ?? '',
    slaStatus: ticket.slaStatus ?? '',
    responseDueAt: ticket.responseDueAt ?? '',
    resolutionDueAt: ticket.resolutionDueAt ?? '',
    firstRespondedAt: ticket.firstRespondedAt ?? '',
    resolvedAt: ticket.resolvedAt ?? '',
    totalHoldSeconds: ticket.totalHoldSeconds ?? 0,
    awaitingCustomerReply: ticket.awaitingCustomerReply ? 'true' : 'false',
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
  };
}

export function buildTicketsCsv(tickets: TicketListItem[]): string {
  return toCsv(tickets.map(ticketToExportRow), TICKET_EXPORT_COLUMNS);
}

export async function fetchTicketsForExport(
  params: Omit<ListTicketsParams, 'page' | 'size' | 'includeCounts'>,
): Promise<{ items: TicketListItem[]; truncated: boolean }> {
  const items: TicketListItem[] = [];
  let page = 1;
  let pages = 1;

  while (page <= pages && items.length < TICKET_EXPORT_MAX_ROWS) {
    const url = buildListTicketsUrl({
      ...params,
      page,
      size: TICKET_EXPORT_PAGE_SIZE,
    });
    const response = await http.get<TicketListPage>(url);
    const data = response.data;
    items.push(...(data.items ?? []));
    pages = Math.max(data.pages ?? 1, 1);
    if (!data.items?.length) break;
    page += 1;
  }

  const truncated = items.length >= TICKET_EXPORT_MAX_ROWS && page <= pages;
  return {
    items: items.slice(0, TICKET_EXPORT_MAX_ROWS),
    truncated,
  };
}
