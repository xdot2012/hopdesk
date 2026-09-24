import { useEffect } from 'react';
import { mutate } from 'swr';

import { TICKET_EVENTS_PATH, TICKET_PATH, TICKET_STATS_PATH, RETRIEVE_USER_PATH } from '~/api';
import refreshTicketDetailCache from '~/api/ticket/refreshTicketDetailCache';
import {
  armBrowserNotificationPermissionPrompt,
  showTicketBrowserNotification,
} from '~/lib/browserNotifications';
import http from '~/services/http';
import { getSession } from '~/services/session';
import useTicketArrivalStore from '~/store/ticketArrivalStore';
import useTicketDetailDialogStore from '~/store/ticketDetailDialogStore';
import useUserStore from '~/store/userStore';

type TicketChangedEvent = {
  type: 'ticket.changed';
  ticketId: string;
  action: 'created' | 'updated' | 'message';
  requesterUserId: string;
  actorUserId?: string;
  number?: number;
  subject?: string;
  priorityCode?: string;
};

const MAX_BACKOFF_MS = 30_000;
const INITIAL_BACKOFF_MS = 1_000;

function isTicketListKey(key: unknown): key is string {
  return typeof key === 'string' && (key === TICKET_PATH || key.startsWith(`${TICKET_PATH}?`));
}

function isTicketStatsKey(key: unknown): key is string {
  return typeof key === 'string' && (key === TICKET_STATS_PATH || key.startsWith(`${TICKET_STATS_PATH}?`));
}

/** List + stats keys that should refresh when a ticket changes. */
function isLiveTicketQueryKey(key: unknown): boolean {
  return isTicketListKey(key) || isTicketStatsKey(key);
}

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });
}

async function consumeTicketEventStream(
  body: ReadableStream<Uint8Array>,
  signal: AbortSignal,
  onTicketChanged: (event: TicketChangedEvent) => Promise<void>,
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (!signal.aborted) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split('\n\n');
      buffer = chunks.pop() ?? '';

      for (const chunk of chunks) {
        const data = chunk
          .split('\n')
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).trim())
          .join('\n');
        if (!data) continue;

        try {
          const event = JSON.parse(data) as TicketChangedEvent;
          if (event.type === 'ticket.changed' && event.ticketId) {
            await onTicketChanged(event);
          }
        } catch {
          // ignore malformed frames
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function useSubscribeTicketEvents() {
  useEffect(() => {
    armBrowserNotificationPermissionPrompt();

    const controller = new AbortController();
    let backoffMs = INITIAL_BACKOFF_MS;

    async function invalidateTicketCaches(event: TicketChangedEvent) {
      const openTicketId = useTicketDetailDialogStore.getState().ticketId;
      // Only refetch detail when that ticket is open — avoids a GET per SSE while on the queue.
      if (openTicketId === event.ticketId) {
        try {
          await refreshTicketDetailCache(event.ticketId);
        } catch {
          // ignore detail refresh failures
        }
      }

      // mutate(filter) only fetches keys with active subscribers — inactive paginated
      // pages left in cache by keepPreviousData are skipped (no bulk page storm).
      try {
        await mutate(isLiveTicketQueryKey);
      } catch {
        // ignore bulk revalidation failures
      }

      // Mentions create inbox notifications; skip profile refresh for status/assign updates.
      if (event.action === 'message') {
        try {
          await mutate(RETRIEVE_USER_PATH);
        } catch {
          // ignore profile revalidation failures
        }
      }
    }

    async function handleTicketChanged(event: TicketChangedEvent) {
      const currentUserId = useUserStore.getState().profile?.id;
      const isOwnAction =
        Boolean(event.actorUserId) &&
        Boolean(currentUserId) &&
        event.actorUserId === currentUserId;

      if (event.action === 'created' && !isOwnAction) {
        useTicketArrivalStore.getState().pushArrival({
          ticketId: event.ticketId,
          number: event.number,
          subject: event.subject,
          priorityCode: event.priorityCode,
        });
      }
      showTicketBrowserNotification({
        ticketId: event.ticketId,
        action: event.action,
        actorUserId: event.actorUserId,
        number: event.number,
        subject: event.subject,
      });
      await invalidateTicketCaches(event);
    }

    async function connectLoop() {
      while (!controller.signal.aborted) {
        const { tokenType, accessToken } = getSession();
        if (!accessToken) {
          return;
        }

        try {
          const baseURL = http.defaults.baseURL ?? 'http://localhost:8000/';
          const url = new URL(TICKET_EVENTS_PATH.replace(/^\//, ''), baseURL);
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              Accept: 'text/event-stream',
              Authorization: `${tokenType} ${accessToken}`,
            },
            credentials: 'include',
            signal: controller.signal,
          });

          if (!response.ok || !response.body) {
            throw new Error(`SSE connection failed (${response.status})`);
          }

          backoffMs = INITIAL_BACKOFF_MS;
          await consumeTicketEventStream(response.body, controller.signal, handleTicketChanged);
        } catch {
          if (controller.signal.aborted) {
            return;
          }
          try {
            await sleep(backoffMs, controller.signal);
          } catch {
            return;
          }
          backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS);
        }
      }
    }

    void connectLoop();
    return () => controller.abort();
  }, []);
}

export default useSubscribeTicketEvents;
