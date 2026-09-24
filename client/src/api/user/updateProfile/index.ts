import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormValidation } from '~/hooks';
import { createUpdateProfileSchema, UpdateProfileType } from './schema';
import { UPDATE_PROFILE_PATH } from '~/api';

export interface UpdateProfileResponseProps {
  email: string;
  name: string | null;
  avatarUrl: string | null;
  createdAt: string;
  emailConfirmed: boolean;
}

function useUpdateProfile(defaultValues?: Partial<UpdateProfileType>) {
  const { i18n: i18nInstance } = useTranslation();
  const schema = useMemo(() => createUpdateProfileSchema(), [i18nInstance.language]);

  return useFormValidation<UpdateProfileResponseProps>(schema, UPDATE_PROFILE_PATH, {
    method: 'put',
    defaultValues,
  });
}

export default useUpdateProfile;
