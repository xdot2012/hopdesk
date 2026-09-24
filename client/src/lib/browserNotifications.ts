import { toast } from 'sonner';
import i18n from '~/i18n';
import useAlertStore from '~/store/alertStore';
import useTicketDetailDialogStore from '~/store/ticketDetailDialogStore';
import useUserStore from '~/store/userStore';
import { isCustomerRole } from '~/util/roles';

export type TicketBrowserNotificationAction = 'created' | 'updated' | 'message';

const PERMISSION_PROMPT_FLAG = 'hopdesk.browserNotifications.asked';

export function browserNotificationsSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getBrowserNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!browserNotificationsSupported()) return 'unsupported';
  return Notification.permission;
}

/** Ask once after a user gesture when permission is still undecided. */
export function ensureBrowserNotificationPermission() {
  if (!browserNotificationsSupported()) return;
  if (Notification.permission !== 'default') return;
  if (sessionStorage.getItem(PERMISSION_PROMPT_FLAG) === '1') return;
  sessionStorage.setItem(PERMISSION_PROMPT_FLAG, '1');
  void Notification.requestPermission();
}

export function armBrowserNotificationPermissionPrompt() {
  if (!browserNotificationsSupported()) return;
  if (Notification.permission !== 'default') return;

  const ask = () => {
    ensureBrowserNotificationPermission();
    window.removeEventListener('pointerdown', ask);
    window.removeEventListener('keydown', ask);
  };

  window.addEventListener('pointerdown', ask, { once: true });
  window.addEventListener('keydown', ask, { once: true });
}

function notificationCopy(
  action: TicketBrowserNotificationAction,
  forCustomer: boolean,
  opts?: { number?: number | null; subject?: string | null },
): { title: string; body: string } {
  if (forCustomer && action !== 'created') {
    return {
      title: i18n.t('tickets.browserNotifications.customerTicketUpdatedTitle'),
      body: i18n.t('tickets.browserNotifications.customerTicketUpdatedBody'),
    };
  }

  if (action === 'created') {
    const title = i18n.t('tickets.browserNotifications.newTicketTitle');
    if (forCustomer) {
      return {
        title,
        body: i18n.t('tickets.browserNotifications.customerNewTicketBody'),
      };
    }
    if (opts?.number != null) {
      return {
        title,
        body: i18n.t('tickets.browserNotifications.newTicketBodyWithNumber', {
          number: opts.number,
          subject: opts.subject?.trim() || i18n.t('dashboard.arrival.noSubject'),
        }),
      };
    }
    return {
      title,
      body: i18n.t('tickets.browserNotifications.newTicketBody'),
    };
  }

  return {
    title: i18n.t('tickets.browserNotifications.ticketUpdatedTitle'),
    body: i18n.t('tickets.browserNotifications.ticketUpdatedBody'),
  };
}

export function showTicketBrowserNotification(opts: {
  ticketId: string;
  action: TicketBrowserNotificationAction;
  actorUserId?: string | null;
  number?: number | null;
  subject?: string | null;
}) {
  const profile = useUserStore.getState().profile;
  const currentUserId = profile?.id;
  if (opts.actorUserId && currentUserId && opts.actorUserId === currentUserId) {
    return;
  }

  const forCustomer = isCustomerRole(profile?.role);
  const { title, body } = notificationCopy(opts.action, forCustomer, {
    number: opts.number,
    subject: opts.subject,
  });

  const openTicket = () => {
    useTicketDetailDialogStore.getState().openTicket(opts.ticketId);
  };

  if (forCustomer) {
    useAlertStore.getState().showSuccessSnack(body);
  } else if (opts.action === 'created') {
    toast.info(body, {
      action: {
        label: i18n.t('dashboard.arrival.openTicket'),
        onClick: openTicket,
      },
    });
  } else if (document.hidden) {
    useAlertStore.getState().showSuccessSnack(body);
  }

  if (!browserNotificationsSupported()) return;
  if (Notification.permission !== 'granted') return;

  try {
    const notification = new Notification(title, {
      body,
      tag: `ticket-${opts.action}-${opts.ticketId}`,
      renotify: true,
    } as NotificationOptions);
    notification.onclick = () => {
      window.focus();
      openTicket();
      notification.close();
    };
  } catch {
    // Some environments grant permission but still block Notification construction.
  }
}
