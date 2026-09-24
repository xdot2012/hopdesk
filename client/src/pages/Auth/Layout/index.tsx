import { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import AppLogo from '~/components/AppLogo';
import ChangeModeButton from '~/components/ChangeModeButton';
import PageMessage from '~/components/PageMessage';
import { useAlertStore } from '~/store';

interface Props {
  children?: ReactNode;
}

export default function LayoutAuth({ children }: Props) {
  const { show, severity, variant, message, closeMessage } = useAlertStore((state) => state);

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-muted/50 p-4">
      <div className="relative flex w-full max-w-md flex-col items-center rounded-xl border border-border bg-card p-8 shadow-sm">
        <AppLogo size="xl" className="mb-6 w-full max-w-[280px] justify-center" />
        <PageMessage show={show} handleClose={closeMessage} severity={severity} variant={variant}>
          {message}
        </PageMessage>
        <div className="w-full">
          <Outlet />
          {children}
        </div>
        <div className="mt-6 flex w-full justify-end">
          <ChangeModeButton />
        </div>
      </div>
    </div>
  );
}
