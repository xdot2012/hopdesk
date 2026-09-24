import { describe, expect, it } from 'vitest';
import {
  canTransitionBoardStatus,
  getAllowedBoardTargets,
  getStatusTransitionAction,
  normalizeBoardStatus,
} from './ticketStatusActions';

describe('normalizeBoardStatus', () => {
  it('maps legacy statuses onto the board', () => {
    expect(normalizeBoardStatus('resolved')).toBe('testing');
    expect(normalizeBoardStatus('waiting_customer')).toBe('in_progress');
    expect(normalizeBoardStatus('open')).toBe('open');
  });
});

describe('canTransitionBoardStatus', () => {
  it('allows forward moves and close anytime', () => {
    expect(canTransitionBoardStatus('open', 'triage')).toBe(true);
    expect(canTransitionBoardStatus('open', 'in_progress')).toBe(true);
    expect(canTransitionBoardStatus('in_progress', 'closed')).toBe(true);
  });

  it('blocks same status, backward moves and triage from non-open', () => {
    expect(canTransitionBoardStatus('open', 'open')).toBe(false);
    expect(canTransitionBoardStatus('in_progress', 'open')).toBe(false);
    expect(canTransitionBoardStatus('in_progress', 'triage')).toBe(false);
  });
});

describe('getAllowedBoardTargets', () => {
  it('lists only valid next columns from open', () => {
    expect(getAllowedBoardTargets('open')).toEqual([
      'triage',
      'in_progress',
      'testing',
      'closed',
    ]);
  });
});

describe('getStatusTransitionAction', () => {
  it('detects triage and close actions', () => {
    expect(getStatusTransitionAction('open', 'triage')).toBe('triage_first_contact');
    expect(getStatusTransitionAction('triage', 'in_progress')).toBe('triage_exit');
    expect(getStatusTransitionAction('in_progress', 'closed')).toBe('close');
    expect(getStatusTransitionAction('open', 'in_progress')).toBeNull();
  });
});
