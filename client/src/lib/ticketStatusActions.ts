import type { TFunction } from 'i18next';

import type { TicketListItem } from '~/api/ticket/types';

export const BOARD_STATUSES = [
  'open',
  'triage',
  'in_progress',
  'testing',
  'closed',
] as const;

export type BoardStatus = (typeof BOARD_STATUSES)[number];

export type StatusTransitionAction =
  | 'triage_first_contact'
  | 'triage_exit'
  | 'close';

export function normalizeBoardStatus(status: string): BoardStatus | string {
  if (status === 'resolved') return 'testing';
  if (status === 'waiting_customer') return 'in_progress';
  return status;
}

export function getBoardStatusIndex(status: string) {
  const normalized = normalizeBoardStatus(status);
  return BOARD_STATUSES.indexOf(normalized as BoardStatus);
}

/** Cards move right only; closed anytime; triage only from open. */
export function canTransitionBoardStatus(fromStatus: string, toStatus: BoardStatus) {
  const from = normalizeBoardStatus(fromStatus);
  if (from === toStatus) return false;
  if (toStatus === 'closed') return true;
  if (toStatus === 'triage' && from !== 'open') return false;

  const fromIndex = getBoardStatusIndex(from);
  const toIndex = getBoardStatusIndex(toStatus);
  if (fromIndex === -1 || toIndex === -1) return false;
  return toIndex > fromIndex;
}

export function getAllowedBoardTargets(fromStatus: string): BoardStatus[] {
  return BOARD_STATUSES.filter((status) => canTransitionBoardStatus(fromStatus, status));
}

export function getStatusTransitionAction(
  fromStatus: string,
  toStatus: string,
): StatusTransitionAction | null {
  const from = normalizeBoardStatus(fromStatus);
  if (toStatus === 'closed' && from !== 'closed') {
    return 'close';
  }
  if (from === 'open' && toStatus === 'triage') {
    return 'triage_first_contact';
  }
  if (from === 'triage' && toStatus !== 'triage') {
    return 'triage_exit';
  }
  return null;
}

export function buildTriageFirstContactMessage(t: TFunction, ticket: TicketListItem) {
  const requesterName =
    ticket.requesterName?.trim() ||
    ticket.requesterEmail?.split('@')[0] ||
    t('tickets.board.triageContact.defaultRequesterName');

  return t('tickets.board.triageContact.defaultMessage', {
    requesterName,
    number: ticket.number,
    subject: ticket.subject,
  });
}
