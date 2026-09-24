import { useTranslation } from 'react-i18next';
import SecurityForm from './Form';

export default function SecurityTab() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {t('settings.security.description')}
      </p>
      <SecurityForm />
    </div>
  );
}
