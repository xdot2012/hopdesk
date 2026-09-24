import { AxiosError, AxiosRequestConfig } from 'axios';
import useSWRMutation, { SWRMutationConfiguration } from 'swr/mutation';
import http from '../services/http';

function useMutation<Request = any, Response = any>(
  endpoint: string,
  axiosConfig?: AxiosRequestConfig,
  swrConfig?: SWRMutationConfiguration<{ data: Response; status: number }, AxiosError>
) {
  const fetcher = (url: string, { arg }: { arg: Request }) =>
    http<Response>({ url, data: arg, ...axiosConfig }).then(({ data, status }) => {
      return { data, status };
    });

  const response = useSWRMutation(endpoint, fetcher, swrConfig);

  return response;
}

export default useMutation;