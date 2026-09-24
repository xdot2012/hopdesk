import { Ban, CircleDot, Clock3, FlaskConical, Inbox, XCircle } from 'lucide-react';

export default function StatusIcon({ status }: { status: string }) {
  const className = 'mr-1 h-3 w-3 shrink-0';
  switch (status) {
    case 'triage':
      return <Inbox className={className} aria-hidden />;
    case 'open':
      return <CircleDot className={className} aria-hidden />;
    case 'in_progress':
    case 'waiting_customer':
      return <Clock3 className={className} aria-hidden />;
    case 'testing':
    case 'resolved':
      return <FlaskConical className={className} aria-hidden />;
    case 'closed':
      return <XCircle className={className} aria-hidden />;
    case 'cancelled_by_requester':
      return <Ban className={className} aria-hidden />;
    default:
      return null;
  }
}
