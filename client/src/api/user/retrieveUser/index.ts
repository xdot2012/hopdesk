import { RETRIEVE_USER_PATH } from '~/api';
import useImmutableQuery from '~/hooks/useImmutableQuery';

export interface NotificationProps {
    id: string
    title: string
    text: string
    link?: string | null
    created_at?: string
    createdAt?: string
}

export interface UserProfileResponseProps {
    id: string;
    email: string;
    name?: string | null;
    avatarUrl?: string | null;
    avatarKey?: string | null;
    locale?: string;
    emailConfirmed?: boolean;
    created_at: string;
    role?: string | null;
    permissions: string[];
    notifications: NotificationProps[];
  }

function useRetrieveUser() {
  const { data: response, ...rest } = useImmutableQuery<UserProfileResponseProps>(RETRIEVE_USER_PATH, {
    method: 'get',
    headers: {
      'Cache-Control': 'max-age=900'
    }
  },
);
  return { response, ...rest };
}

export default useRetrieveUser;
