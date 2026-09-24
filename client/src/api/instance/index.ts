import { INSTANCE_PATH } from '~/api';
import useImmutableQuery from '~/hooks/useImmutableQuery';
import useMutation from '~/hooks/useMutation';

export type InstanceSettings = {
  id: string;
  timezone: string;
  ticketEmailOnCreated: boolean;
  ticketEmailOnPublicMessage: boolean;
  ticketEmailOnStatusChange: boolean;
  ticketEmailOnAssignment: boolean;
};

export type UpdateInstancePayload = {
  timezone: string;
  ticketEmailOnCreated?: boolean;
  ticketEmailOnPublicMessage?: boolean;
  ticketEmailOnStatusChange?: boolean;
  ticketEmailOnAssignment?: boolean;
};

function useGetInstance(enabled = true) {
  const { data, ...rest } = useImmutableQuery<InstanceSettings>(
    enabled ? INSTANCE_PATH : null,
    { method: 'get' },
  );
  return { instance: data?.data, ...rest };
}

function useUpdateInstance() {
  return useMutation<UpdateInstancePayload, InstanceSettings>(INSTANCE_PATH, {
    method: 'put',
  });
}

export { useGetInstance, useUpdateInstance };
export default useGetInstance;
