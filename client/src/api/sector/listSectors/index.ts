import { SECTOR_PATH } from '~/api';
import useImmutableQuery from '~/hooks/useImmutableQuery';

export type Sector = {
  id: string;
  name: string;
  color: string;
  createdAt: string;
};

function useListSectors(enabled = true) {
  const { data, ...rest } = useImmutableQuery<Sector[]>(enabled ? SECTOR_PATH : null, {
    method: 'get',
  });
  return { sectors: data?.data ?? [], ...rest };
}

export default useListSectors;
