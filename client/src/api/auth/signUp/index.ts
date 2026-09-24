import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { SING_UP_PATH } from '~/api';
import { useFormValidation } from '../../../hooks';
import { createSignUpSchema } from './schema';

export interface UserResponseProps {
  id: number;
  name: string;
  email: string;
}

function useCreateUser() {
  const { i18n: i18nInstance } = useTranslation();
  const schema = useMemo(() => createSignUpSchema(), [i18nInstance.language]);

  return useFormValidation<UserResponseProps>(schema, SING_UP_PATH);
}

export default useCreateUser;
