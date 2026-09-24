import { MARK_NOTIFICATIONS_READ_PATH } from '~/api';
import http from '~/services/http';
import useUserStore from '~/store/userStore';

async function markNotificationsRead(notificationIds: string[]) {
  if (notificationIds.length === 0) return;

  await http.post(MARK_NOTIFICATIONS_READ_PATH, {
    notificationIds,
  });

  const profile = useUserStore.getState().profile;
  if (!profile) return;

  const remaining = (profile.notifications ?? []).filter(
    (notification) => !notificationIds.includes(notification.id),
  );

  useUserStore.getState().setUserProfile({
    ...profile,
    notifications: remaining,
  });
}

export default markNotificationsRead;
