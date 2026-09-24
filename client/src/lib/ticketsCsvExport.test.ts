import { describe, expect, it } from 'vitest';
import type { TicketListItem } from '~/api/ticket/types';
import { buildTicketsCsv, TICKET_EXPORT_COLUMNS } from './ticketsCsvExport';

function sampleTicket(overrides: Partial<TicketListItem> = {}): TicketListItem {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    number: 42,
    subject: 'Printer offline',
    status: 'closed',
    priorityId: '22222222-2222-4222-8222-222222222222',
    priorityCode: 'medium',
    priorityLabel: 'Média',
    sectorId: '33333333-3333-4333-8333-333333333333',
    sectorName: 'TI',
    requesterUserId: '44444444-4444-4444-8444-444444444444',
    requesterName: 'Ana',
    requesterEmail: 'ana@example.com',
    assigneeUserId: '55555555-5555-4555-8555-555555555555',
    assigneeName: 'Bruno',
    assigneeEmail: 'bruno@example.com',
    slaStatus: 'fulfilled',
    responseDueAt: '2026-09-01T10:00:00Z',
    resolutionDueAt: '2026-09-02T10:00:00Z',
    firstRespondedAt: '2026-09-01T09:30:00Z',
    resolvedAt: '2026-09-01T12:00:00Z',
    totalHoldSeconds: 120,
    awaitingCustomerReply: false,
    createdAt: '2026-09-01T09:00:00Z',
    updatedAt: '2026-09-01T12:00:00Z',
    externalId: 'EXT-1',
    ...overrides,
  };
}

describe('buildTicketsCsv', () => {
  it('exports raw ticket columns without aggregates or UUIDs', () => {
    const csv = buildTicketsCsv([sampleTicket()]);
    const [header, row] = csv.split('\r\n');

    expect(header).toBe(TICKET_EXPORT_COLUMNS.map((column) => column.header).join(','));
    expect(header).not.toContain('fulfillmentRate');
    expect(header).not.toContain('avgFirstResponseMinutes');
    expect(header.split(',')).not.toEqual(expect.arrayContaining(['id', 'sectorId', 'assigneeUserId', 'requesterUserId']));
    expect(row).toContain('42');
    expect(row).toContain('Printer offline');
    expect(row).toContain('medium');
    expect(row).toContain('TI');
    expect(row).toContain('fulfilled');
    expect(row).not.toContain('11111111-1111-4111-8111-111111111111');
  });

  it('serializes empty optional fields as blanks', () => {
    const csv = buildTicketsCsv([
      sampleTicket({
        externalId: null,
        assigneeUserId: null,
        assigneeName: null,
        assigneeEmail: null,
        firstRespondedAt: null,
        resolvedAt: null,
        slaStatus: null,
      }),
    ]);
    const row = csv.split('\r\n')[1];
    expect(row.startsWith('42,,Printer offline')).toBe(true);
  });
});
