import ChangeModeButton from '~/components/ChangeModeButton';
import ChangeLanguageSelect from '~/components/ChangeLanguageSelect';
import { useTranslation } from 'react-i18next';

export default function PreferencesTab() {
  const { t } = useTranslation();

  return (
    <div className="flex justify-center">
      <div className="w-full">
        <div className="flex items-center justify-between border-b py-4">
          <div>
            <span className="text-sm font-medium">{t('language.label')}</span>
            <p className="text-xs text-muted-foreground">{t('language.description')}</p>
          </div>
          <ChangeLanguageSelect />
        </div>
        <div className="flex items-center justify-between border-b py-4">
          <div>
            <span className="text-sm font-medium">{t('theme.label')}</span>
            <p className="text-xs text-muted-foreground">{t('theme.description')}</p>
          </div>
          <ChangeModeButton />
        </div>
      </div>
    </div>
  );
}
