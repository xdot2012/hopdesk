import { Navigate } from 'react-router-dom';
import { SETTINGS } from '~/router/paths';

/** Legacy route — user sectors live under Settings → Users. */
export default function UserSectorsPage() {
  return <Navigate to={`${SETTINGS}?tab=users`} replace />;
}
