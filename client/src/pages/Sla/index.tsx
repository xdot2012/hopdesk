import { Navigate } from 'react-router-dom';
import { SETTINGS } from '~/router/paths';

/** Legacy route — SLA lives under Settings. */
export default function SlaPage() {
  return <Navigate to={`${SETTINGS}?tab=sla`} replace />;
}
