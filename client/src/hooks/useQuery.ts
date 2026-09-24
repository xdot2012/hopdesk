import useSWR, { SWRConfiguration } from 'swr';
import { AxiosRequestConfig } from 'axios';

import http from '../services/http';

function useQuery<Data = any>(
  key: string | string[] | null,
  axiosConfig?: AxiosRequestConfig,
  swrConfig?: SWRConfiguration
) {
  const fetcher = (url: string) =>
    http.get<Data>(url, axiosConfig).then(({ data, status }) => {
      return { data, status };
    });

  const response = useSWR(key, fetcher, swrConfig);

  if (!response || response == undefined || response.error) {
    throw response?.error;
  }

  return response!;
}

export default useQuery;