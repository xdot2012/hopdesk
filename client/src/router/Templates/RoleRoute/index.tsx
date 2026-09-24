import { Navigate, Outlet, useLocation } from 'react-router-dom';
import AppLoading from '~/components/AppLoading';
import { DASHBOARD, TICKETS } from '~/router/paths';
import { useUserStore } from '~/store';
import { isCustomerRole } from '~/util/roles';

type RoleRouteProps = {
  allow: (role?: string | null) => boolean;
};

export default function RoleRoute({ allow }: RoleRouteProps) {
  const location = useLocation();
  const { profile, isProfileSet } = useUserStore();

  if (!isProfileSet || !profile) {
    return <AppLoading className="p-6" />;
  }

  if (allow(profile.role)) {
    return <Outlet />;
  }

  const home = isCustomerRole(profile.role) ? DASHBOARD : TICKETS;
  return (
    <Navigate
      to={{ pathname: home, search: location.search, hash: location.hash }}
      replace
    />
  );
}
