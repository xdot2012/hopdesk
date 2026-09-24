import { useMemo, useState } from 'react';
import { Controller } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SIGN_IN } from '~/router/paths';
import useCreateUser from '~/api/auth/signUp';
import useListPublicSectors from '~/api/sector/listPublicSectors';
import { AvatarInput, PasswordInput, TextInput } from '~/components/FormControl';
import SelectField from '~/components/SelectField';
import { Label } from '~/components/ui/label';
import { useAlertStore } from '~/store';
import { SignUpType } from '~/api/auth/signUp/schema';
import { Button } from '~/components/ui/button';
import { hasFieldValidationErrors } from '~/util/functions';

export default function SignUpForm() {
  const { t } = useTranslation();
  const [isBlocked, setIsBlocked] = useState(false);
  const { showError, showSuccessMessage } = useAlertStore((state) => state);
  const { create, isMutating, control, errors, handleSubmit } = useCreateUser();
  const { sectors, isLoading: loadingSectors } = useListPublicSectors();
  const navigate = useNavigate();

  const sectorOptions = useMemo(
    () =>
      sectors.map((sector) => ({
        value: sector.id,
        label: sector.name,
      })),
    [sectors],
  );

  const onSubmit = (signUpData: SignUpType) => {
    setIsBlocked(true);
    const { confirm, ...payload } = signUpData;
    create({
      ...payload,
      avatarKey: payload.avatarKey || undefined,
    }).then(() => {
      showSuccessMessage(t('auth.signUp.accountCreated'));
      navigate(SIGN_IN);
    }).catch((error) => {
      if (!hasFieldValidationErrors(error)) {
        showError(error);
      }
      setIsBlocked(false);
    });
  };

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex w-full flex-col">
      <AvatarInput
        name="avatarKey"
        label={t('auth.signUp.avatarLabel')}
        defaultValue=""
        fallbackText="?"
        showLabel={false}
        control={control}
        fieldError={errors.avatarKey}
      />
      <TextInput
        name="name"
        autoComplete="name"
        label={t('settings.profile.yourName')}
        defaultValue=""
        control={control}
        fieldError={errors.name}
      />
      <TextInput
        name="email"
        type="email"
        autoComplete="username"
        label={t('common.email')}
        defaultValue=""
        control={control}
        fieldError={errors.email}
      />
      <div className="mb-4 space-y-2">
        <Label htmlFor="sign-up-sector">{t('auth.signUp.sector')}</Label>
        <Controller
          name="sectorId"
          control={control}
          defaultValue=""
          render={({ field }) => (
            <SelectField
              id="sign-up-sector"
              value={field.value}
              onValueChange={field.onChange}
              options={sectorOptions}
              placeholder={t('auth.signUp.sectorPlaceholder')}
              disabled={loadingSectors || sectorOptions.length === 0}
              required
              aria-label={t('auth.signUp.sector')}
            />
          )}
        />
        {errors.sectorId?.message ? (
          <p className="text-sm text-destructive">{String(errors.sectorId.message)}</p>
        ) : null}
      </div>
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
        label={t('auth.signUp.confirmPassword')}
        defaultValue=""
        control={control}
        fieldError={errors.confirm}
      />
      <Button type="submit" className="mt-6 mb-4 w-full" disabled={isMutating || isBlocked}>
        {t('auth.signUp.submit')}
      </Button>
    </form>
  );
}
