import { SWRConfiguration } from 'swr';
import { AxiosRequestConfig } from 'axios';
import useSwrImmutable from 'swr/immutable';

import http from '../services/http';

function useImmutableQuery<Data = any>(
  key: string | string[] | null,
  axiosConfig?: AxiosRequestConfig,
  swrConfig?: SWRConfiguration
) {
  const fetcher = (url: string) =>
    http.get<Data>(url, axiosConfig).then(({ data, status }) => {
      return { data, status };
    });

  const response = useSwrImmutable(key, fetcher, swrConfig);

  return response;
}

export default useImmutableQuery;