import { SLA_PATH } from '~/api';
import useImmutableQuery from '~/hooks/useImmutableQuery';
import useSWRMutation from 'swr/mutation';
import http from '~/services/http';

export type SlaTarget = {
  id: string;
  priorityId: string;
  priorityCode?: string | null;
  priorityLabel?: string | null;
  firstResponseMinutes: number;
  resolutionMinutes: number;
};

export type SlaPolicy = {
  id: string;
  name: string;
  isDefault: boolean;
  enabled: boolean;
  timezone: string;
  priorityTargets: SlaTarget[];
};

function useGetSla(enabled = true) {
  const { data, ...rest } = useImmutableQuery<SlaPolicy>(
    enabled ? SLA_PATH : null,
    { method: 'get' },
  );
  return { policy: data?.data, ...rest };
}

function useUpdateSla() {
  return useSWRMutation(
    'sla-update',
    async (
      _key: string,
      {
        arg,
      }: {
        arg: {
          timezone: string;
          targets: Array<{
            priorityId: string;
            firstResponseMinutes: number;
            resolutionMinutes: number;
          }>;
        };
      },
    ) => {
      const response = await http.put<SlaPolicy>(
        SLA_PATH,
        arg,
      );
      return { data: response.data, status: response.status };
    },
  );
}

export { useGetSla, useUpdateSla };
