import { create } from 'zustand';

type NewTicketDialogStore = {
  open: boolean;
  openDialog: () => void;
  closeDialog: () => void;
  setOpen: (open: boolean) => void;
};

const useNewTicketDialogStore = create<NewTicketDialogStore>((set) => ({
  open: false,
  openDialog: () => set({ open: true }),
  closeDialog: () => set({ open: false }),
  setOpen: (open) => set({ open }),
}));

export default useNewTicketDialogStore;
