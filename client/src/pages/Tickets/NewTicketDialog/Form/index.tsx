import type { FormEvent, ReactNode } from 'react';
import {
  createTicketSchema,
  type CreateTicketFormType,
} from '~/api/ticket/createTicket/schema';

type Props = {
  values: CreateTicketFormType;
  onValidSubmit: (values: CreateTicketFormType) => void | Promise<void>;
  children: ReactNode;
  className?: string;
};

export default function NewTicketForm({
  values,
  onValidSubmit,
  children,
  className,
}: Props) {
  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const result = createTicketSchema.safeParse(values);
    if (!result.success) return;
    await onValidSubmit(result.data);
  };

  return (
    <form noValidate onSubmit={onSubmit} className={className}>
      {children}
    </form>
  );
}
