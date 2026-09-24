import { LIST_USERS_PATH, userRolePath } from '~/api';
import useImmutableQuery from '~/hooks/useImmutableQuery';
import useSWRMutation from 'swr/mutation';
import http from '~/services/http';
import { ROLE_ADMIN, ROLE_AGENT, ROLE_CUSTOMER } from '~/util/roles';

export type ManagedUserRole = typeof ROLE_CUSTOMER | typeof ROLE_AGENT | typeof ROLE_ADMIN;

export type ManagedUser = {
  id: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
  role?: ManagedUserRole | string | null;
};

function useListUsers(enabled = true) {
  const { data, ...rest } = useImmutableQuery<ManagedUser[]>(enabled ? LIST_USERS_PATH : null, {
    method: 'get',
  });
  return { users: data?.data ?? [], ...rest };
}

function useUpdateUserRole() {
  return useSWRMutation(
    'user-role-update',
    async (
      _key: string,
      {
        arg,
      }: {
        arg: {
          userId: string;
          role: ManagedUserRole;
        };
      },
    ) => {
      const response = await http.put<ManagedUser>(userRolePath(arg.userId), {
        role: arg.role,
      });
      return { data: response.data, status: response.status };
    },
  );
}

export { useListUsers, useUpdateUserRole };
export default useListUsers;
