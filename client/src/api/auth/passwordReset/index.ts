import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormValidation } from '~/hooks';
import { useParams } from 'react-router-dom';
import { createPasswordResetSchema } from './schema';
import { PASSWORD_RESET_PATH } from '~/api';

export interface PasswordResetResponseProps {
  message: string;
}

function usePasswordReset() {
  const { code } = useParams();
  const { i18n: i18nInstance } = useTranslation();
  const schema = useMemo(() => createPasswordResetSchema(), [i18nInstance.language]);

  return useFormValidation<PasswordResetResponseProps>(schema, `${PASSWORD_RESET_PATH}/${code}`);
}

export default usePasswordReset;
