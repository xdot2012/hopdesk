export type TicketPriority = {
  id: string;
  code: string;
  label: string;
  sortOrder: number;
};

export type TicketListItem = {
  id: string;
  number: number;
  subject: string;
  description?: string | null;
  pageUrl?: string | null;
  externalId?: string | null;
  status: string;
  priorityId: string;
  priorityCode?: string | null;
  priorityLabel?: string | null;
  sectorId?: string | null;
  sectorName?: string | null;
  sectorColor?: string | null;
  requesterUserId?: string | null;
  requesterName?: string | null;
  requesterEmail?: string | null;
  requesterAvatarUrl?: string | null;
  assigneeUserId?: string | null;
  assigneeName?: string | null;
  assigneeEmail?: string | null;
  assigneeAvatarUrl?: string | null;
  responseDueAt?: string | null;
  resolutionDueAt?: string | null;
  firstRespondedAt?: string | null;
  slaStatus?: string | null;
  totalHoldSeconds?: number | null;
  holdStartedAt?: string | null;
  resolvedAt?: string | null;
  awaitingCustomerReply?: boolean;
  attachmentCount?: number | null;
  createdAt: string;
  updatedAt: string;
  hasUnreadUpdate?: boolean;
};

export type TicketMessage = {
  id: string;
  ticketId: string;
  authorUserId: string;
  authorName?: string | null;
  authorAvatarUrl?: string | null;
  visibility: string;
  body: string;
  customerPending?: boolean;
  createdAt: string;
  updatedAt: string;
  attachments?: TicketAttachment[];
};

export type TicketAttachment = {
  id: string;
  fileKey: string;
  originalFilename: string;
  contentType: string;
  size: number;
  url?: string | null;
};

export type TicketDetail = TicketListItem & {
  description: string;
  pageUrl?: string | null;
  requesterUserId: string;
  firstRespondedAt?: string | null;
  cause?: string | null;
  solution?: string | null;
  solutionInternal?: boolean;
  effortMinutes?: number | null;
  satisfactionRating?: number | null;
  satisfactionComment?: string | null;
  satisfactionRatedAt?: string | null;
  messages: TicketMessage[];
  attachments: TicketAttachment[];
};
