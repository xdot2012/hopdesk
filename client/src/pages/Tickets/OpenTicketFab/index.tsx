import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '~/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip';
import { useNewTicketDialogStore, useTicketDetailDialogStore } from '~/store';

export default function OpenTicketFab() {
  const { t } = useTranslation();
  const openDialog = useNewTicketDialogStore((state) => state.openDialog);
  const newTicketOpen = useNewTicketDialogStore((state) => state.open);
  const detailOpen = useTicketDetailDialogStore((state) => Boolean(state.ticketId));
  const label = t('dashboard.actions.newTicket.title');

  if (newTicketOpen || detailOpen) {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          size="icon"
          className="fixed bottom-6 right-6 z-20 h-14 w-14 rounded-full shadow-lg"
          onClick={openDialog}
          aria-label={label}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left">{label}</TooltipContent>
    </Tooltip>
  );
}
