import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DASHBOARD } from '~/router/paths';
import { useNewTicketDialogStore } from '~/store';

/** Deep link /tickets/new — abre o modal e volta ao painel. */
export default function NewTicketPage() {
  const navigate = useNavigate();
  const openDialog = useNewTicketDialogStore((state) => state.openDialog);

  useEffect(() => {
    openDialog();
    navigate(DASHBOARD, { replace: true });
  }, [navigate, openDialog]);

  return null;
}
