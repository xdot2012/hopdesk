import { TICKET_PATH } from '~/api';
import useMutation from '~/hooks/useMutation';
import type { TicketDetail } from '../types';

export type CreateTicketAttachmentPayload = {
  key: string;
  originalFilename: string;
  contentType: string;
  size: number;
};

export type CreateTicketPayload = {
  subject: string;
  description: string;
  attachments: CreateTicketAttachmentPayload[];
  priorityId?: string;
  externalId?: string;
  sectorId?: string;
};

function useCreateTicket() {
  return useMutation<CreateTicketPayload, TicketDetail>(TICKET_PATH, { method: 'post' });
}

export default useCreateTicket;
