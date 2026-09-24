import { SECTOR_PUBLIC_PATH } from '~/api';
import useImmutableQuery from '~/hooks/useImmutableQuery';
import type { Sector } from '~/api/sector/listSectors';

function useListPublicSectors(enabled = true) {
  const { data, ...rest } = useImmutableQuery<Sector[]>(
    enabled ? SECTOR_PUBLIC_PATH : null,
    { method: 'get' },
  );
  return { sectors: data?.data ?? [], ...rest };
}

export default useListPublicSectors;
