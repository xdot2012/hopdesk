import { useTranslation } from 'react-i18next';
import { useGetInstance, useUpdateInstance } from '~/api/instance';
import AppLoading from '~/components/AppLoading';
import { useAlertStore } from '~/store';
import { getApiErrorMessage } from '~/util/functions';
import EmailNotificationsForm from './Form';
import type { EmailNotificationsFormType } from './schema';

export default function EmailNotificationsPanel() {
  const { t } = useTranslation();
  const { showErrorSnack, showSuccessSnack } = useAlertStore();
  const { instance, isLoading, mutate } = useGetInstance();
  const { trigger, isMutating } = useUpdateInstance();

  if (isLoading && !instance) {
    return <AppLoading />;
  }

  if (!instance) {
    return null;
  }

  const defaultValues: EmailNotificationsFormType = {
    ticketEmailOnCreated: Boolean(instance.ticketEmailOnCreated),
    ticketEmailOnPublicMessage: Boolean(instance.ticketEmailOnPublicMessage),
    ticketEmailOnStatusChange: Boolean(instance.ticketEmailOnStatusChange),
    ticketEmailOnAssignment: Boolean(instance.ticketEmailOnAssignment),
  };

  const onSubmit = async (values: EmailNotificationsFormType) => {
    try {
      await trigger({
        timezone: instance.timezone,
        ticketEmailOnCreated: values.ticketEmailOnCreated,
        ticketEmailOnPublicMessage: values.ticketEmailOnPublicMessage,
        ticketEmailOnStatusChange: values.ticketEmailOnStatusChange,
        ticketEmailOnAssignment: values.ticketEmailOnAssignment,
      });
      await mutate();
      showSuccessSnack(t('settings.notifications.email.saved'));
    } catch (error: unknown) {
      showErrorSnack(
        getApiErrorMessage(error, t('settings.notifications.email.saveError')),
      );
    }
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">
          {t('settings.notifications.email.title')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t('settings.notifications.email.subtitle')}
        </p>
      </div>
      <EmailNotificationsForm
        key={[
          String(defaultValues.ticketEmailOnCreated),
          String(defaultValues.ticketEmailOnPublicMessage),
          String(defaultValues.ticketEmailOnStatusChange),
          String(defaultValues.ticketEmailOnAssignment),
        ].join('-')}
        defaultValues={defaultValues}
        isSaving={isMutating}
        onSubmit={onSubmit}
      />
    </section>
  );
}
