import { USER_SECTOR_PATH, userSectorPath } from '~/api';
import useImmutableQuery from '~/hooks/useImmutableQuery';
import useMutation from '~/hooks/useMutation';
import useSWRMutation from 'swr/mutation';
import http from '~/services/http';

export type UserSector = {
  id: string;
  userId: string;
  userEmail?: string | null;
  userName?: string | null;
  userAvatarUrl?: string | null;
  sectorId?: string | null;
  sectorName?: string | null;
  sectorColor?: string | null;
  isSectorManager?: boolean;
};

function useListUserSectors(enabled = true) {
  const { data, ...rest } = useImmutableQuery<UserSector[]>(
    enabled ? USER_SECTOR_PATH : null,
    { method: 'get' },
  );
  return { userSectors: data?.data ?? [], ...rest };
}

function useAddUserSector() {
  return useMutation<{ userId: string; sectorId?: string | null }, UserSector>(
    USER_SECTOR_PATH,
    {
      method: 'post',
    },
  );
}

function useUpdateUserSector() {
  return useSWRMutation(
    'user-sector-update',
    async (
      _key: string,
      {
        arg,
      }: {
        arg: {
          userSectorId: string;
          sectorId?: string | null;
          isSectorManager?: boolean;
        };
      },
    ) => {
      const response = await http.put<UserSector>(userSectorPath(arg.userSectorId), {
        sectorId: arg.sectorId,
        isSectorManager: arg.isSectorManager,
      });
      return { data: response.data, status: response.status };
    },
  );
}

function useDeleteUserSector() {
  return useSWRMutation(
    'user-sector-delete',
    async (_key: string, { arg }: { arg: { userSectorId: string } }) => {
      const response = await http.delete(userSectorPath(arg.userSectorId));
      return { data: response.data, status: response.status };
    },
  );
}

export {
  useListUserSectors,
  useAddUserSector,
  useUpdateUserSector,
  useDeleteUserSector,
};
export default useListUserSectors;
