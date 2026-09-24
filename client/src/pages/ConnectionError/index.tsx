import { WifiOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AppLogo from '~/components/AppLogo';
import { Button } from '~/components/ui/button';
import { TICKETS } from '~/router/paths';
import {
  clearConnectionErrorReturnTo,
  getConnectionErrorReturnTo,
} from '~/services/http/redirectOnNetworkError';

export default function ConnectionErrorPage() {
  const { t } = useTranslation();

  const handleRetry = () => {
    const returnTo = getConnectionErrorReturnTo(TICKETS);
    clearConnectionErrorReturnTo();
    window.location.assign(returnTo);
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-muted/50 p-4">
      <div className="flex w-full max-w-md flex-col items-center rounded-xl border bg-card p-8 text-center shadow-sm">
        <AppLogo size="lg" className="mb-4" />
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <WifiOff className="h-7 w-7 text-muted-foreground" aria-hidden />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t('connectionError.title')}
        </h1>
        <p className="mt-2 text-base text-muted-foreground">
          {t('connectionError.description')}
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          {t('connectionError.suggestion')}
        </p>
        <Button
          type="button"
          className="mt-8 w-full"
          size="lg"
          onClick={handleRetry}
        >
          {t('connectionError.retry')}
        </Button>
      </div>
    </div>
  );
}
