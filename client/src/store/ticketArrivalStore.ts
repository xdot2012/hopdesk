import { create } from 'zustand';

export type TicketArrival = {
  ticketId: string;
  number?: number | null;
  subject?: string | null;
  priorityCode?: string | null;
  at: number;
};

const MAX_ARRIVALS = 10;

type TicketArrivalStore = {
  arrivals: TicketArrival[];
  pushArrival: (arrival: Omit<TicketArrival, 'at'> & { at?: number }) => void;
  dismiss: (ticketId: string) => void;
  dismissAll: () => void;
};

const useTicketArrivalStore = create<TicketArrivalStore>((set) => ({
  arrivals: [],
  pushArrival: (arrival) => {
    set((state) => {
      const next = [
        {
          ticketId: arrival.ticketId,
          number: arrival.number,
          subject: arrival.subject,
          priorityCode: arrival.priorityCode,
          at: arrival.at ?? Date.now(),
        },
        ...state.arrivals.filter((item) => item.ticketId !== arrival.ticketId),
      ].slice(0, MAX_ARRIVALS);
      return { arrivals: next };
    });
  },
  dismiss: (ticketId) => {
    set((state) => ({
      arrivals: state.arrivals.filter((item) => item.ticketId !== ticketId),
    }));
  },
  dismissAll: () => set({ arrivals: [] }),
}));

export default useTicketArrivalStore;
