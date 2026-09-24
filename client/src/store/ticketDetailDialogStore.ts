import { create } from 'zustand';

type TicketDetailDialogStore = {
  ticketId: string | null;
  openTicket: (ticketId: string) => void;
  closeDialog: () => void;
  setTicketId: (ticketId: string | null) => void;
};

const useTicketDetailDialogStore = create<TicketDetailDialogStore>((set) => ({
  ticketId: null,
  openTicket: (ticketId) => set({ ticketId }),
  closeDialog: () => set({ ticketId: null }),
  setTicketId: (ticketId) => set({ ticketId }),
}));

export default useTicketDetailDialogStore;
