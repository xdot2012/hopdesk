import PasswordResetForm from './Form';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SIGN_IN } from '~/router/paths';

export default function PasswordReset() {
  const { t } = useTranslation();

  return (
    <>
      <h1 className="mb-2 text-2xl font-semibold">{t('auth.passwordReset.title')}</h1>
      <p className="mb-6 text-sm text-muted-foreground">{t('auth.passwordReset.subtitle')}</p>
      <PasswordResetForm />
      <div className="mt-4 flex w-full justify-end text-sm">
        <Link to={SIGN_IN} className="text-primary hover:underline">
          {t('common.backToSignIn')}
        </Link>
      </div>
    </>
  );
}
