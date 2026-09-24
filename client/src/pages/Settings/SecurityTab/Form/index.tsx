import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import useUpdatePassword from '~/api/user/updatePassword';
import { PasswordInput } from '~/components/FormControl';
import { useAlertStore } from '~/store';
import ButtonWithDialog from '~/components/ButtonWithDialog';
import { UpdatePasswordType } from '~/api/user/updatePassword/schema';
import { hasFieldValidationErrors } from '~/util/functions';

export default function SecurityForm() {
  const { t } = useTranslation();
  const [isBlocked, setIsBlocked] = useState(false);
  const { showErrorSnack, showSuccessSnack } = useAlertStore((state) => state);
  const { create, isMutating, control, errors, handleSubmit } = useUpdatePassword();

  const onSubmit = (data: UpdatePasswordType) => {
    setIsBlocked(true);
    create(data).then(() => {
      showSuccessSnack(t('settings.security.passwordUpdated'));
    }).catch((error) => {
      if (!hasFieldValidationErrors(error)) {
        showErrorSnack(error);
      }
    }).finally(() => {
      setIsBlocked(false);
    });
  };

  return (
    <div className="flex w-full flex-col items-center">
      <PasswordInput
        name="oldPassword"
        autoComplete="current-password"
        label={t('settings.security.currentPassword')}
        defaultValue=""
        control={control}
        fieldError={errors.oldPassword}
      />
      <PasswordInput
        name="newPassword"
        autoComplete="new-password"
        label={t('settings.security.newPassword')}
        defaultValue=""
        control={control}
        fieldError={errors.newPassword}
      />
      <ButtonWithDialog
        type="submit"
        className="mt-6 mb-4"
        disabled={isMutating || isBlocked}
        onConfirm={handleSubmit(onSubmit)}
        dialogTitle={t('settings.security.updatePasswordTitle')}
        dialogText={t('settings.security.updatePasswordDescription')}
      >
        {t('settings.security.updatePassword')}
      </ButtonWithDialog>
    </div>
  );
}
