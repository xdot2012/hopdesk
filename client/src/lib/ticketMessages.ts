export const STATUS_CHANGE_MESSAGE_PREFIX = 'Status alterado de ';
export const STATUS_CHANGE_MESSAGE_CODE_PREFIX = 'status_change:';
export const TICKET_OPENED_MESSAGE_CODE_PREFIX = 'ticket_opened:';
export const ASSIGNEE_CHANGE_MESSAGE_CODE_PREFIX = 'assignee_change:';

const LEGACY_STATUS_LABELS: Record<string, string> = {
  Triagem: 'triage',
  Aberto: 'open',
  'Em atendimento': 'in_progress',
  'Aguardando cliente': 'waiting_customer',
  Testando: 'testing',
  Fechado: 'closed',
};

export type StatusChangeDetails = {
  fromStatus: string;
  toStatus: string;
};

export type AssigneeChangeDetails = {
  assigneeUserId: string;
  assigneeName: string;
};

export function isStatusChangeMessage(body?: string | null) {
  if (!body) return false;
  return (
    body.startsWith(STATUS_CHANGE_MESSAGE_CODE_PREFIX) ||
    body.startsWith(STATUS_CHANGE_MESSAGE_PREFIX)
  );
}

export function isTicketOpenedMessage(body?: string | null) {
  if (!body) return false;
  return body.startsWith(TICKET_OPENED_MESSAGE_CODE_PREFIX);
}

export function isAssigneeChangeMessage(body?: string | null) {
  if (!body) return false;
  return body.startsWith(ASSIGNEE_CHANGE_MESSAGE_CODE_PREFIX);
}

export function isSystemActivityMessage(body?: string | null) {
  return (
    isStatusChangeMessage(body) ||
    isTicketOpenedMessage(body) ||
    isAssigneeChangeMessage(body)
  );
}

export function parseStatusChangeMessage(body?: string | null): StatusChangeDetails | null {
  if (!body) return null;

  if (body.startsWith(STATUS_CHANGE_MESSAGE_CODE_PREFIX)) {
    const [, fromStatus, toStatus] = body.split(':');
    if (fromStatus && toStatus) {
      return { fromStatus, toStatus };
    }
    return null;
  }

  if (!body.startsWith(STATUS_CHANGE_MESSAGE_PREFIX)) {
    return null;
  }

  const match = body.match(/^Status alterado de (.+) para (.+)\.?$/);
  if (!match) return null;

  const fromLabel = match[1].trim();
  const toLabel = match[2].trim().replace(/\.$/, '');
  const fromStatus = LEGACY_STATUS_LABELS[fromLabel] ?? fromLabel;
  const toStatus = LEGACY_STATUS_LABELS[toLabel] ?? toLabel;

  return { fromStatus, toStatus };
}

export function parseAssigneeChangeMessage(body?: string | null): AssigneeChangeDetails | null {
  if (!body?.startsWith(ASSIGNEE_CHANGE_MESSAGE_CODE_PREFIX)) return null;

  const rest = body.slice(ASSIGNEE_CHANGE_MESSAGE_CODE_PREFIX.length);
  const colonIdx = rest.indexOf(':');
  if (colonIdx < 0) return null;

  const assigneeUserId = rest.slice(0, colonIdx).trim();
  const assigneeName = rest.slice(colonIdx + 1).trim();
  if (!assigneeUserId) return null;

  return { assigneeUserId, assigneeName };
}
