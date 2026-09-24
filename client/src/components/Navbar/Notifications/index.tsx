import { Bell } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import markNotificationsRead from '~/api/user/markNotificationsRead';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { TICKETS } from '~/router/paths';
import { useTicketDetailDialogStore, useUserStore } from '~/store';
import NotificationMessage from './NotificationMessage';

function ticketIdFromLink(link?: string | null) {
  if (!link) return null;
  const prefix = `${TICKETS}/`;
  if (!link.startsWith(prefix)) return null;
  const id = link.slice(prefix.length).split(/[/?#]/)[0];
  return id || null;
}

export default function UserNotificationsButton() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { profile } = useUserStore();
  const openTicket = useTicketDetailDialogStore((state) => state.openTicket);
  const notifications = profile?.notifications ?? [];
  const count = notifications.length;

  async function dismissNotifications(ids: string[]) {
    try {
      await markNotificationsRead(ids);
    } catch {
      // Keep the inbox visible if the request fails.
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={
            count > 0
              ? t('navbar.notificationsWithCount', { count })
              : t('navbar.notifications')
          }
        >
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center px-1 text-xs"
            >
              {count}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-[70vh] min-w-[320px] max-w-[380px] p-0">
        {notifications.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            {t('navbar.noNotifications')}
          </p>
        ) : (
          notifications.map((notification) => (
            <NotificationMessage
              onClick={() => {
                const ticketId = ticketIdFromLink(notification.link);
                void dismissNotifications([notification.id]);
                if (ticketId) {
                  openTicket(ticketId);
                }
                setOpen(false);
              }}
              onDismiss={() => {
                void dismissNotifications([notification.id]);
              }}
              key={notification.id}
              id={notification.id}
              title={notification.title}
              text={notification.text}
              created_at={
                (notification as { created_at?: string; createdAt?: string }).created_at
                ?? (notification as { createdAt?: string }).createdAt
              }
              unread
            />
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
