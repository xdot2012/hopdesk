import { UPDATE_PREFERENCES_PATH } from '~/api';
import { useMutation } from '~/hooks';
import type { AppLocale } from '~/util/constants';

export interface UpdatePreferencesRequest {
  locale: AppLocale;
}

export interface UpdatePreferencesResponse {
  locale: AppLocale;
}

function useUpdatePreferences() {
  return useMutation<UpdatePreferencesRequest, UpdatePreferencesResponse>(
    UPDATE_PREFERENCES_PATH,
    { method: 'put' },
  );
}

export default useUpdatePreferences;
