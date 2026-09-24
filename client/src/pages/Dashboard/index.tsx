import { useTranslation } from 'react-i18next';
import { Navigate, useLocation } from 'react-router-dom';
import AppLoading from '~/components/AppLoading';
import { TICKETS } from '~/router/paths';
import { useUserStore } from '~/store';
import { isCustomerRole } from '~/util/roles';
import CustomerDashboard from './CustomerDashboard';

export default function Dashboard() {
  const { t } = useTranslation();
  const location = useLocation();
  const { profile, isProfileSet } = useUserStore();
  const displayName = profile?.name ?? profile?.email?.split('@')[0] ?? t('common.user');
  const role = profile?.role;

  if (!isProfileSet || !profile) return <AppLoading />;
  if (isCustomerRole(role)) return <CustomerDashboard displayName={displayName} />;

  return (
    <Navigate
      to={{ pathname: TICKETS, search: location.search, hash: location.hash }}
      replace
    />
  );
}
