import { SECTOR_PATH, sectorPath } from '~/api';
import useMutation from '~/hooks/useMutation';
import useSWRMutation from 'swr/mutation';
import http from '~/services/http';
import type { Sector } from '../listSectors';

function useCreateSector() {
  return useMutation<{ name: string; color?: string }, Sector>(SECTOR_PATH, {
    method: 'post',
  });
}

function useUpdateSector() {
  return useSWRMutation(
    'sector-update',
    async (
      _key: string,
      { arg }: { arg: { sectorId: string; name?: string; color?: string } },
    ) => {
      const response = await http.put<Sector>(sectorPath(arg.sectorId), {
        name: arg.name,
        color: arg.color,
      });
      return { data: response.data, status: response.status };
    },
  );
}

function useDeleteSector() {
  return useSWRMutation(
    'sector-delete',
    async (_key: string, { arg }: { arg: { sectorId: string } }) => {
      const response = await http.delete(sectorPath(arg.sectorId));
      return { data: response.data, status: response.status };
    },
  );
}

export { useCreateSector, useUpdateSector, useDeleteSector };
