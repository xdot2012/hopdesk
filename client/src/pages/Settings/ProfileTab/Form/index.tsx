import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import useUpdateProfile from '~/api/user/updateProfile';
import useRetrieveUser from '~/api/user/retrieveUser';
import { AvatarInput, TextInput } from '~/components/FormControl';
import { useAlertStore, useUserStore } from '~/store';
import { Button } from '~/components/ui/button';
import { UpdateProfileType } from '~/api/user/updateProfile/schema';
import { hasFieldValidationErrors } from '~/util/functions';

export default function ProfileInfoForm() {
  const { t } = useTranslation();
  const [isBlocked, setIsBlocked] = useState(false);
  const profile = useUserStore((state) => state.profile);
  const { setUserProfile } = useUserStore();
  const { showErrorSnack, showSuccessSnack } = useAlertStore((state) => state);
  const { mutate } = useRetrieveUser();

  const { create, isMutating, control, errors, handleSubmit, watch, getValues, reset } = useUpdateProfile({
    name: profile?.name ?? '',
    email: profile?.email ?? '',
    avatarKey: profile?.avatarKey ?? '',
  });

  if (!profile) {
    return null;
  }

  const watchedName = watch('name');
  const fallbackText = (watchedName?.trim() || profile.name || profile.email.split('@')[0])
    .charAt(0)
    .toUpperCase();

  const showEmailPendingAlert = profile.emailConfirmed === false;

  const onSubmit = (data: UpdateProfileType) => {
    setIsBlocked(true);
    const avatarKey = getValues('avatarKey') ?? data.avatarKey ?? profile.avatarKey ?? '';
    const emailChanged = data.email.trim().toLowerCase() !== profile.email.trim().toLowerCase();

    create({
      name: data.name,
      email: data.email,
      avatarKey,
    }).then(({ data: response }) => {
      const updatedProfile = {
        ...profile,
        name: response.name ?? data.name,
        email: response.email ?? data.email,
        emailConfirmed: response.emailConfirmed,
        avatarUrl: response.avatarUrl ?? null,
        avatarKey: avatarKey || null,
      };

      setUserProfile(updatedProfile as any);
      mutate();
      reset({
        name: updatedProfile.name ?? '',
        email: updatedProfile.email,
        avatarKey: updatedProfile.avatarKey ?? '',
      });

      if (emailChanged) {
        showSuccessSnack(t('settings.profile.profileUpdatedEmailPending'));
      } else {
        showSuccessSnack(t('settings.profile.profileUpdated'));
      }
    }).catch((error) => {
      if (!hasFieldValidationErrors(error)) {
        showErrorSnack(error);
      }
    }).finally(() => {
      setIsBlocked(false);
    });
  };

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex w-full flex-col">
      <div className="flex flex-col items-center pb-2">
        <AvatarInput
          name="avatarKey"
          className="pt-0"
          previewUrl={profile.avatarUrl ?? ''}
          fallbackText={fallbackText}
          showLabel={false}
          control={control}
          fieldError={errors.avatarKey}
        />
      </div>

      <TextInput
        name="name"
        label={t('settings.profile.yourName')}
        control={control}
        fieldError={errors.name}
      />
      <TextInput
        name="email"
        type="email"
        label={t('settings.profile.email')}
        control={control}
        fieldError={errors.email}
      />
      {showEmailPendingAlert && (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          {t('settings.profile.emailPendingConfirmation')}
        </p>
      )}
      <Button type="submit" className="mt-6 mb-4 w-full" disabled={isMutating || isBlocked}>
        {t('settings.profile.saveProfile')}
      </Button>
    </form>
  );
}
