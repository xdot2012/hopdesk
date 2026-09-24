import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import usePasswordRecovery from '~/api/auth/passwordRecovery';
import { PasswordRecoveryType } from '~/api/auth/passwordRecovery/schema';
import { TextInput } from '~/components/FormControl';
import { Button } from '~/components/ui/button';
import { SIGN_IN } from '~/router/paths';
import { useAlertStore } from '~/store';

export default function PasswordRecoveryForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { create, isMutating, control, errors, handleSubmit } = usePasswordRecovery();
  const { showError, showSuccessMessage } = useAlertStore((state) => state);

  const onSubmit = (passwordRecoveryData: PasswordRecoveryType) => {
    create(passwordRecoveryData).then(({ data }) => {
      showSuccessMessage(data.message);
      navigate(SIGN_IN);
    }).catch((error) => {
      showError(error);
    });
  };

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex w-full flex-col">
      <TextInput
        name="email"
        type="email"
        autoComplete="username"
        label={t('common.email')}
        defaultValue=""
        control={control}
        fieldError={errors.email}
      />
      <Button type="submit" className="mt-6 mb-4 w-full" disabled={isMutating}>
        {t('auth.forgotPassword.submit')}
      </Button>
    </form>
  );
}
