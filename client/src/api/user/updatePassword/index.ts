import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormValidation } from '~/hooks';
import { createUpdatePasswordSchema } from './schema';
import { UPDATE_PASSWORD_PATH } from '~/api';

export interface UpdatePasswordResponseProps {
  email: string;
  name: string | null;
  avatarUrl: string | null;
  createdAt: string;
  emailConfirmed: boolean;
}

function useUpdatePassword() {
  const { i18n: i18nInstance } = useTranslation();
  const schema = useMemo(() => createUpdatePasswordSchema(), [i18nInstance.language]);

  return useFormValidation<UpdatePasswordResponseProps>(schema, UPDATE_PASSWORD_PATH, { method: 'put' });
}

export default useUpdatePassword;
