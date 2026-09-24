import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button } from '~/components/ui/button';
import { Label } from '~/components/ui/label';
import { Switch } from '~/components/ui/switch';
import {
  emailNotificationsSchema,
  type EmailNotificationsFormType,
} from '../schema';

type Props = {
  defaultValues: EmailNotificationsFormType;
  isSaving: boolean;
  onSubmit: (values: EmailNotificationsFormType) => Promise<void>;
};

export default function EmailNotificationsForm({
  defaultValues,
  isSaving,
  onSubmit,
}: Props) {
  const { t } = useTranslation();
  const { control, handleSubmit } = useForm<EmailNotificationsFormType>({
    mode: 'onChange',
    resolver: zodResolver(emailNotificationsSchema),
    defaultValues,
  });

  const toggles: {
    name: keyof EmailNotificationsFormType;
    labelKey: string;
    descriptionKey: string;
  }[] = [
    {
      name: 'ticketEmailOnCreated',
      labelKey: 'settings.notifications.email.onCreated',
      descriptionKey: 'settings.notifications.email.onCreatedHint',
    },
    {
      name: 'ticketEmailOnPublicMessage',
      labelKey: 'settings.notifications.email.onPublicMessage',
      descriptionKey: 'settings.notifications.email.onPublicMessageHint',
    },
    {
      name: 'ticketEmailOnStatusChange',
      labelKey: 'settings.notifications.email.onStatusChange',
      descriptionKey: 'settings.notifications.email.onStatusChangeHint',
    },
    {
      name: 'ticketEmailOnAssignment',
      labelKey: 'settings.notifications.email.onAssignment',
      descriptionKey: 'settings.notifications.email.onAssignmentHint',
    },
  ];

  return (
    <form
      noValidate
      className="w-full space-y-4"
      onSubmit={handleSubmit(onSubmit)}
    >
      <ul className="space-y-4">
        {toggles.map(({ name, labelKey, descriptionKey }) => (
          <li
            key={name}
            className="flex items-start justify-between gap-4 border-b border-border pb-4 last:border-0 last:pb-0"
          >
            <div className="min-w-0 space-y-1">
              <Label htmlFor={name} className="text-sm font-medium">
                {t(labelKey)}
              </Label>
              <p className="text-sm text-muted-foreground">{t(descriptionKey)}</p>
            </div>
            <Controller
              name={name}
              control={control}
              render={({ field }) => (
                <Switch
                  id={name}
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  aria-label={t(labelKey)}
                />
              )}
            />
          </li>
        ))}
      </ul>
      <Button type="submit" disabled={isSaving}>
        {t('settings.notifications.email.save')}
      </Button>
    </form>
  );
}
