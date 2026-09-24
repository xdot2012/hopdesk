import { useRouteError } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import EmptyState from '~/components/EmptyState';
import { TICKETS } from '~/router/paths';
import { Link } from 'react-router-dom';

export default function ErrorPage() {
  const { t } = useTranslation();
  const error: any = useRouteError();

  return (
    <div id="error-page" className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-md space-y-4">
        <EmptyState
          title={t('errors.pageTitle')}
          description={t('errors.pageDescription')}
        />
        {error?.statusText || error?.message ? (
          <p className="text-center text-sm text-muted-foreground">
            <i>{error.statusText || error.message}</i>
          </p>
        ) : null}
        <p className="text-center">
          <Link to={TICKETS} className="text-sm text-primary hover:underline">
            {t('common.backToDashboard')}
          </Link>
        </p>
      </div>
    </div>
  );
}
