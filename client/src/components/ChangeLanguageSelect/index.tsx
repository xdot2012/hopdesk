import { useTranslation } from 'react-i18next';
import useRetrieveUser from '~/api/user/retrieveUser';
import useUpdatePreferences from '~/api/user/updatePreferences';
import { cn } from '~/lib/utils';
import { setAppLocale } from '~/i18n';
import { useAlertStore, useUserStore } from '~/store';
import { SUPPORTED_LOCALES, isAppLocale, type AppLocale } from '~/util/constants';

export default function ChangeLanguageSelect() {
  const { i18n, t } = useTranslation();
  const { profile, isProfileSet, setUserProfile } = useUserStore();
  const { response, mutate } = useRetrieveUser();
  const { trigger: updatePreferences, isMutating } = useUpdatePreferences();
  const { showErrorSnack } = useAlertStore((state) => state);

  const handleChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const locale = event.target.value as AppLocale;

    if (!isAppLocale(locale)) {
      return;
    }

    const previousLocale = isAppLocale(i18n.language) ? i18n.language : undefined;
    setAppLocale(locale);

    if (!isProfileSet || !profile) {
      return;
    }

    try {
      const { data } = await updatePreferences({ locale });
      const nextProfile = {
        ...profile,
        locale: data.locale,
      };
      setUserProfile(nextProfile);

      if (response?.data) {
        await mutate(
          { data: { ...response.data, locale: data.locale }, status: response.status },
          { revalidate: false },
        );
      }
    } catch {
      if (previousLocale) {
        setAppLocale(previousLocale);
      }
      showErrorSnack(t('language.saveError'));
    }
  };

  return (
    <select
      value={i18n.language}
      onChange={handleChange}
      disabled={isMutating}
      aria-label={t('language.label')}
      className={cn(
        'cursor-pointer rounded-md border border-input bg-background px-3 py-2 text-sm',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:cursor-not-allowed disabled:opacity-50',
      )}
    >
      {SUPPORTED_LOCALES.map(({ value, labelKey }) => (
        <option key={value} value={value}>
          {t(labelKey)}
        </option>
      ))}
    </select>
  );
}
