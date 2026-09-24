import { useTranslation } from 'react-i18next';
import ProfileInfoForm from './Form';
import { useUserStore } from '~/store';

export default function ProfileTab() {
  const { t } = useTranslation();
  const { profile, isProfileSet } = useUserStore();

  if (!isProfileSet || !profile) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        {t('common.loading')}
      </p>
    );
  }

  return <ProfileInfoForm />;
}
