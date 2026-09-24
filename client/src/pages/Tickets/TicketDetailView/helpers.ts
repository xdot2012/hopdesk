export function initials(name?: string | null) {
  if (!name?.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
}

/** Active SLA deadline for countdown / overdue display. */
export function getActiveSlaDueAt(
  ticket: {
    slaStatus?: string | null;
    responseDueAt?: string | null;
    resolutionDueAt?: string | null;
    firstRespondedAt?: string | null;
    resolvedAt?: string | null;
  },
  nowMs = Date.now(),
) {
  const status = ticket.slaStatus;
  const responseDue = ticket.responseDueAt ?? null;
  const resolutionDue = ticket.resolutionDueAt ?? null;

  if (status === 'due') {
    return ticket.firstRespondedAt ? (resolutionDue ?? responseDue) : responseDue;
  }

  if (status === 'failed') {
    const responseMs = responseDue ? new Date(responseDue).getTime() : NaN;
    const resolutionMs = resolutionDue ? new Date(resolutionDue).getTime() : NaN;
    const firstRespondedMs = ticket.firstRespondedAt
      ? new Date(ticket.firstRespondedAt).getTime()
      : NaN;
    const resolvedMs = ticket.resolvedAt ? new Date(ticket.resolvedAt).getTime() : NaN;

    // Late resolution breach
    if (
      Number.isFinite(resolutionMs) &&
      Number.isFinite(resolvedMs) &&
      resolvedMs > resolutionMs
    ) {
      return resolutionDue;
    }
    // Late first-response breach (resolution may still be in the future)
    if (
      Number.isFinite(responseMs) &&
      Number.isFinite(firstRespondedMs) &&
      firstRespondedMs > responseMs
    ) {
      return responseDue;
    }
    // Open ticket already marked failed: prefer the overdue deadline
    if (Number.isFinite(resolutionMs) && resolutionMs < nowMs) return resolutionDue;
    if (Number.isFinite(responseMs) && responseMs < nowMs) return responseDue;
    return responseDue ?? resolutionDue;
  }

  return resolutionDue ?? responseDue;
}

export function getSlaMinuteDelta(dueAt: string, nowMs = Date.now()) {
  const diffMs = new Date(dueAt).getTime() - nowMs;
  const minutes = Math.max(0, Math.round(Math.abs(diffMs) / 60_000));
  return {
    overdue: diffMs < 0,
    minutes,
  };
}
