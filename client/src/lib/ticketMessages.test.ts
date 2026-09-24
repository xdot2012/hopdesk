import { describe, expect, it } from 'vitest';
import {
  isAssigneeChangeMessage,
  isStatusChangeMessage,
  isSystemActivityMessage,
  isTicketOpenedMessage,
  parseAssigneeChangeMessage,
  parseStatusChangeMessage,
} from './ticketMessages';

describe('system activity message detectors', () => {
  it('recognizes coded and legacy status changes', () => {
    expect(isStatusChangeMessage('status_change:open:triage')).toBe(true);
    expect(isStatusChangeMessage('Status alterado de Aberto para Triagem.')).toBe(true);
    expect(isStatusChangeMessage('mensagem normal')).toBe(false);
  });

  it('recognizes ticket opened and assignee change codes', () => {
    expect(isTicketOpenedMessage('ticket_opened:abc')).toBe(true);
    expect(isAssigneeChangeMessage('assignee_change:uid:Ada')).toBe(true);
    expect(isSystemActivityMessage('assignee_change:uid:Ada')).toBe(true);
    expect(isSystemActivityMessage('oi')).toBe(false);
  });
});

describe('parseStatusChangeMessage', () => {
  it('parses code format', () => {
    expect(parseStatusChangeMessage('status_change:open:closed')).toEqual({
      fromStatus: 'open',
      toStatus: 'closed',
    });
  });

  it('parses legacy portuguese labels', () => {
    expect(parseStatusChangeMessage('Status alterado de Aberto para Triagem.')).toEqual({
      fromStatus: 'open',
      toStatus: 'triage',
    });
  });
});

describe('parseAssigneeChangeMessage', () => {
  it('parses user id and name', () => {
    expect(parseAssigneeChangeMessage('assignee_change:user-1:Ada Lovelace')).toEqual({
      assigneeUserId: 'user-1',
      assigneeName: 'Ada Lovelace',
    });
  });

  it('returns null for invalid payloads', () => {
    expect(parseAssigneeChangeMessage('assignee_change:')).toBeNull();
    expect(parseAssigneeChangeMessage('hello')).toBeNull();
  });
});
