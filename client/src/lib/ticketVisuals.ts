import type { CSSProperties } from 'react';
import { cn } from '~/lib/utils';

/**
 * Pastel count scale for heatmaps / concordance matrix:
 * 0 gray · 1–3 light green · 4–5 yellow · 6–8 orange · 9+ red
 */
export function countHeatTone(count: number): {
  className: string;
  style?: CSSProperties;
} {
  if (count <= 0) {
    return { className: 'bg-muted/50 text-muted-foreground' };
  }
  if (count <= 3) {
    return {
      className: 'text-foreground',
      style: { backgroundColor: 'oklch(0.9 0.08 145)' },
    };
  }
  if (count <= 5) {
    return {
      className: 'text-foreground',
      style: { backgroundColor: 'oklch(0.92 0.1 95)' },
    };
  }
  if (count <= 8) {
    return {
      className: 'text-foreground',
      style: { backgroundColor: 'oklch(0.88 0.1 55)' },
    };
  }
  return {
    className: 'text-foreground',
    style: { backgroundColor: 'oklch(0.88 0.1 25)' },
  };
}

/**
 * Pastel SLA fulfillment scale for hour heatmaps:
 * no data gray · ≥90 green · ≥70 yellow · ≥50 orange · &lt;50 red
 */
export function slaFulfillmentHeatTone(rate: number | null | undefined): {
  className: string;
  style?: CSSProperties;
} {
  if (rate == null) {
    return { className: 'bg-muted/50 text-muted-foreground' };
  }
  if (rate >= 90) {
    return {
      className: 'text-foreground',
      style: { backgroundColor: 'oklch(0.9 0.08 145)' },
    };
  }
  if (rate >= 70) {
    return {
      className: 'text-foreground',
      style: { backgroundColor: 'oklch(0.92 0.1 95)' },
    };
  }
  if (rate >= 50) {
    return {
      className: 'text-foreground',
      style: { backgroundColor: 'oklch(0.88 0.1 55)' },
    };
  }
  return {
    className: 'text-foreground',
    style: { backgroundColor: 'oklch(0.88 0.1 25)' },
  };
}

/** Semantic classes for ticket status (color + always used with a text label). */
export function ticketStatusClass(status: string) {
  switch (status) {
    case 'triage':
      return 'border-transparent ticket-status-triage';
    case 'open':
      return 'border-transparent ticket-status-open';
    case 'in_progress':
      return 'border-transparent ticket-status-in-progress';
    case 'waiting_customer':
      return 'border-transparent ticket-status-waiting';
    case 'testing':
    case 'resolved': // legacy
      return 'border-transparent ticket-status-testing';
    case 'closed':
      return 'border-transparent ticket-status-closed';
    case 'cancelled_by_requester':
      return 'border-transparent ticket-status-cancelled';
    default:
      return 'border-transparent bg-secondary text-secondary-foreground';
  }
}

/** Chart / solid fills for status (vivid midtones, separate from badge text). */
export function ticketStatusChartColor(status: string) {
  switch (status) {
    case 'triage':
      return 'var(--chart-triage)';
    case 'open':
      return 'var(--chart-open)';
    case 'in_progress':
      return 'var(--chart-in-progress)';
    case 'waiting_customer':
      return 'var(--chart-waiting)';
    case 'testing':
      return 'var(--chart-testing)';
    case 'resolved': // legacy
      return 'var(--chart-testing)';
    case 'closed':
      return 'var(--chart-closed)';
    case 'cancelled_by_requester':
      return 'var(--chart-closed)';
    default:
      return 'var(--chart-volume)';
  }
}

export function ticketPriorityClass(code?: string | null) {
  switch (code) {
    case 'low':
      return 'border-transparent ticket-priority-low';
    case 'medium':
      return 'border-transparent ticket-priority-medium';
    case 'high':
      return 'border-transparent ticket-priority-high';
    case 'urgent':
      return 'border-transparent ticket-priority-urgent';
    default:
      return 'border-border bg-muted text-muted-foreground';
  }
}

/** Chart fills for priority bars (vivid midtones). */
export function ticketPriorityChartColor(code?: string | null) {
  switch (code) {
    case 'low':
      return 'var(--chart-priority-low)';
    case 'medium':
      return 'var(--chart-priority-medium)';
    case 'high':
      return 'var(--chart-priority-high)';
    case 'urgent':
      return 'var(--chart-priority-urgent)';
    default:
      return 'var(--chart-volume)';
  }
}

/** Chart fills for backlog aging buckets. */
export function ticketAgingChartColor(bucket: string) {
  switch (bucket) {
    case 'lt_1d':
      return 'var(--chart-aging-lt-1d)';
    case 'd1_3':
      return 'var(--chart-aging-d1-3)';
    case 'd3_7':
      return 'var(--chart-aging-d3-7)';
    case 'gt_7d':
      return 'var(--chart-aging-gt-7d)';
    default:
      return 'var(--chart-volume)';
  }
}

/** Soft surface tint for priority-grouped cards (SLA targets, etc.). */
export function ticketPrioritySurfaceClass(code?: string | null) {
  switch (code) {
    case 'low':
      return 'border-[color-mix(in_oklch,var(--priority-low-foreground)_28%,transparent)] bg-[color-mix(in_oklch,var(--priority-low)_55%,transparent)]';
    case 'medium':
      return 'border-[color-mix(in_oklch,var(--priority-medium-foreground)_28%,transparent)] bg-[color-mix(in_oklch,var(--priority-medium)_55%,transparent)]';
    case 'high':
      return 'border-[color-mix(in_oklch,var(--priority-high-foreground)_28%,transparent)] bg-[color-mix(in_oklch,var(--priority-high)_55%,transparent)]';
    case 'urgent':
      return 'border-[color-mix(in_oklch,var(--priority-urgent-foreground)_28%,transparent)] bg-[color-mix(in_oklch,var(--priority-urgent)_55%,transparent)]';
    default:
      return 'border-border bg-muted/30';
  }
}

export function ticketSlaClass(status?: string | null) {
  switch (status) {
    case 'failed':
      return 'border-transparent ticket-sla-failed';
    case 'due':
    case 'due_first_response':
    case 'due_resolution':
      return 'border-transparent ticket-sla-due';
    case 'fulfilled':
      return 'border-transparent ticket-sla-ok';
    case 'paused':
      return 'border-transparent ticket-status-closed';
    default:
      return 'border-border bg-muted text-muted-foreground';
  }
}

export function ticketSlaChartColor(status: string) {
  switch (status) {
    case 'failed':
      return 'var(--chart-sla-failed)';
    case 'due':
    case 'due_first_response':
      return 'var(--chart-sla-due)';
    case 'due_resolution':
      return 'var(--chart-sla-resolution)';
    case 'fulfilled':
      return 'var(--chart-sla-ok)';
    case 'paused':
      return 'var(--chart-sla-paused)';
    default:
      return 'var(--chart-closed)';
  }
}

export function isSlaBreached(status?: string | null) {
  return status === 'failed';
}

/** CSS color for priority flag icons on kanban cards (vivid midtones). */
export function ticketPriorityFlagColor(code?: string | null) {
  return ticketPriorityChartColor(code);
}

/** Active elapsed minutes since creation, excluding hold/pause periods. */
export function ticketElapsedActiveMinutes(opts: {
  createdAt: string;
  totalHoldSeconds?: number | null;
  holdStartedAt?: string | null;
  resolvedAt?: string | null;
  status?: string | null;
  nowMs?: number;
}) {
  const nowMs = opts.nowMs ?? Date.now();
  const finished =
    opts.status === 'closed' ||
    opts.status === 'testing' ||
    opts.status === 'resolved' ||
    opts.status === 'cancelled_by_requester';
  const endMs =
    finished && opts.resolvedAt ? new Date(opts.resolvedAt).getTime() : nowMs;
  const startMs = new Date(opts.createdAt).getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return 0;

  let holdSeconds = opts.totalHoldSeconds ?? 0;
  if (opts.holdStartedAt && !finished) {
    const holdStartMs = new Date(opts.holdStartedAt).getTime();
    if (!Number.isNaN(holdStartMs)) {
      holdSeconds += Math.max(0, Math.floor((nowMs - holdStartMs) / 1000));
    }
  }

  const activeSeconds = Math.max(0, Math.floor((endMs - startMs) / 1000) - holdSeconds);
  return Math.floor(activeSeconds / 60);
}

export function ticketRowUrgencyClass(opts: {
  slaStatus?: string | null;
  priorityCode?: string | null;
}) {
  if (isSlaBreached(opts.slaStatus)) {
    return 'bg-[color-mix(in_oklch,var(--sla-failed)_40%,transparent)] hover:bg-[color-mix(in_oklch,var(--sla-failed)_55%,transparent)]';
  }
  if (opts.priorityCode === 'urgent') {
    return 'bg-[color-mix(in_oklch,var(--priority-urgent)_25%,transparent)] hover:bg-[color-mix(in_oklch,var(--priority-urgent)_40%,transparent)]';
  }
  return undefined;
}

function ticketStatusFgVar(status: string) {
  switch (status) {
    case 'triage':
      return '--status-triage-foreground';
    case 'open':
      return '--status-open-foreground';
    case 'in_progress':
      return '--status-in-progress-foreground';
    case 'waiting_customer':
      return '--status-waiting-foreground';
    case 'testing':
    case 'resolved':
      return '--status-testing-foreground';
    case 'closed':
      return '--status-closed-foreground';
    case 'cancelled_by_requester':
      return '--status-cancelled-foreground';
    default:
      return '--muted-foreground';
  }
}

function ticketStatusBgVar(status: string) {
  switch (status) {
    case 'triage':
      return '--status-triage';
    case 'open':
      return '--status-open';
    case 'in_progress':
      return '--status-in-progress';
    case 'waiting_customer':
      return '--status-waiting';
    case 'testing':
    case 'resolved':
      return '--status-testing';
    case 'closed':
      return '--status-closed';
    case 'cancelled_by_requester':
      return '--status-cancelled';
    default:
      return '--muted';
  }
}

/** Kanban column — soft status wash; identity lives in top accent + badge. */
export function ticketBoardColumnStyle(status: string): CSSProperties {
  const fgVar = ticketStatusFgVar(status);
  const bgVar = ticketStatusBgVar(status);

  return {
    backgroundColor: `color-mix(in oklch, var(${bgVar}) 35%, var(--background))`,
    borderColor: `color-mix(in oklch, var(${fgVar}) 30%, transparent)`,
    borderStyle: 'solid',
    borderWidth: 1,
    borderTopWidth: 4,
    borderTopColor: `var(${fgVar})`,
  };
}

/** Kanban column header — stronger status wash behind the badge. */
export function ticketBoardColumnHeaderStyle(status: string): CSSProperties {
  const bgVar = ticketStatusBgVar(status);
  return {
    backgroundColor: `color-mix(in oklch, var(${bgVar}) 28%, transparent)`,
  };
}

/** Kanban card surface — neutral card background (urgency shown via icons). */
export function ticketCardSurfaceStyle(_opts?: {
  slaStatus?: string | null;
  priorityCode?: string | null;
}): CSSProperties {
  return {
    backgroundColor: 'var(--card)',
  };
}

export function ticketMessageBubbleClass(opts: {
  isRequester: boolean;
  isInternal: boolean;
}) {
  if (opts.isInternal) {
    return cn(
      'border border-dashed border-[color-mix(in_oklch,var(--status-waiting-foreground)_40%,transparent)] bg-[color-mix(in_oklch,var(--status-waiting)_50%,transparent)]',
    );
  }
  if (opts.isRequester) {
    return 'border border-border bg-muted/60';
  }
  return 'border border-primary/20 bg-primary/8';
}
