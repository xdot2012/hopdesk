import SignInForm from './Form';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FORGOT_PASSWORD, SIGN_UP } from '~/router/paths';

const SignIn = () => {
  const { t } = useTranslation();

  return (
    <>
      <h1 className="mb-2 text-2xl font-semibold">{t('auth.signIn.title')}</h1>
      <p className="mb-6 text-sm text-muted-foreground">{t('auth.signIn.subtitle')}</p>
      <SignInForm />
      <div className="mt-4 flex w-full justify-between text-sm">
        <Link to={FORGOT_PASSWORD} className="text-primary hover:underline">
          {t('auth.signIn.forgotPassword')}
        </Link>
        <Link to={SIGN_UP} className="text-primary hover:underline">
          {t('auth.signIn.createAccount')}
        </Link>
      </div>
    </>
  );
};

export default SignIn;
