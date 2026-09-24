import { useTranslation } from 'react-i18next';
import { useGetSla } from '~/api/sla';
import { useUserStore } from '~/store';
import {
  DEFAULT_INSTANCE_TIMEZONE,
} from '~/util/instanceTimezones';
import { isAdminRole } from '~/util/roles';
import SlaForm from './Form';

export default function SlaTab() {
  const { t } = useTranslation();
  const { profile } = useUserStore();
  const admin = isAdminRole(profile?.role);
  const { policy, isLoading, mutate } = useGetSla();
  const isInitialLoading = isLoading && !policy;

  if (isInitialLoading) {
    return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">{t('sla.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('sla.subtitle')}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('sla.businessHours')}
        </p>
      </div>

      <SlaForm
        key={`${policy?.id ?? 'empty'}-${policy?.timezone ?? DEFAULT_INSTANCE_TIMEZONE}`}
        admin={admin}
        defaultValues={{
          timezone: policy?.timezone || DEFAULT_INSTANCE_TIMEZONE,
          targets:
            policy?.priorityTargets.map((target) => ({
              priorityId: target.priorityId,
              priorityCode: target.priorityCode,
              priorityLabel:
                target.priorityLabel || target.priorityCode || '',
              firstResponseMinutes: target.firstResponseMinutes,
              resolutionMinutes: target.resolutionMinutes,
            })) ?? [],
        }}
        onSaved={() => mutate()}
      />
    </div>
  );
}
