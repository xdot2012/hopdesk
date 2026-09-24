import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import usePasswordReset from '~/api/auth/passwordReset';
import { PasswordResetType } from '~/api/auth/passwordReset/schema';
import useValidatePasswordResetCode from '~/api/auth/passwordResetCodeValidate';
import { PasswordInput } from '~/components/FormControl';
import { Button } from '~/components/ui/button';
import { SIGN_IN } from '~/router/paths';
import { useAlertStore } from '~/store';

export default function PasswordResetForm() {
  const { t } = useTranslation();
  const [isBlocked, setIsBlocked] = useState(false);
  const { showError, showSuccessMessage, showErrorMessage } = useAlertStore((state) => state);
  const { data: validationResponse, isLoading } = useValidatePasswordResetCode();
  const navigate = useNavigate();
  const { create, isMutating, control, errors, handleSubmit } = usePasswordReset();

  useEffect(() => {
    if (isLoading) return;

    if (!validationResponse?.data.isValid) {
      showErrorMessage(t('auth.passwordReset.invalidCode'));
      navigate(SIGN_IN);
    }
  }, [isLoading, validationResponse, navigate, showErrorMessage, t]);

  const onSubmit = (data: PasswordResetType) => {
    setIsBlocked(true);
    create(data).then(() => {
      showSuccessMessage(t('auth.passwordReset.passwordChanged'));
      navigate(SIGN_IN);
    }).catch((error) => {
      showError(error);
      setIsBlocked(false);
    });
  };

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex w-full flex-col">
      <PasswordInput
        name="password"
        autoComplete="new-password"
        label={t('common.password')}
        defaultValue=""
        control={control}
        fieldError={errors.password}
      />
      <PasswordInput
        name="confirm"
        autoComplete="new-password"
        label={t('auth.passwordReset.confirmPassword')}
        defaultValue=""
        control={control}
        fieldError={errors.confirm}
      />
      <Button type="submit" className="mt-6 mb-4 w-full" disabled={isMutating || isBlocked}>
        {t('auth.passwordReset.submit')}
      </Button>
    </form>
  );
}
