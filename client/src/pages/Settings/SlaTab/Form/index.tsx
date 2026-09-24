import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Controller, useForm } from 'react-hook-form';
import { useUpdateSla } from '~/api/sla';
import SelectField from '~/components/SelectField';
import { TicketPriorityBadge } from '~/components/TicketBadges';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import { ticketPrioritySurfaceClass } from '~/lib/ticketVisuals';
import { cn } from '~/lib/utils';
import { useAlertStore } from '~/store';
import { INSTANCE_TIMEZONE_OPTIONS } from '~/util/instanceTimezones';
import { getApiErrorMessage } from '~/util/functions';
import {
  slaSchema,
  type SlaFormType,
} from '../schema';

type Props = {
  admin: boolean;
  defaultValues: SlaFormType;
  onSaved: () => Promise<unknown>;
};

export default function SlaForm({
  admin,
  defaultValues,
  onSaved,
}: Props) {
  const { t } = useTranslation();
  const { trigger, isMutating } = useUpdateSla();
  const { showErrorSnack, showSuccessSnack } = useAlertStore();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SlaFormType>({
    mode: 'onChange',
    resolver: zodResolver(slaSchema),
    defaultValues,
  });

  const onSubmit = async (values: SlaFormType) => {
    if (!admin) return;
    try {
      await trigger({
        timezone: values.timezone,
        targets: values.targets.map(
          ({ priorityId, firstResponseMinutes, resolutionMinutes }) => ({
            priorityId,
            firstResponseMinutes,
            resolutionMinutes,
          }),
        ),
      });
      await onSaved();
      showSuccessSnack(t('sla.saved'));
    } catch (error: unknown) {
      showErrorSnack(
        getApiErrorMessage(error, t('sla.saveError')),
      );
    }
  };

  return (
    <form
      noValidate
      className="w-full space-y-4"
      onSubmit={handleSubmit(onSubmit)}
    >
      <div className="max-w-md space-y-2">
        <Label htmlFor="sla-timezone">
          {t('sla.timezone')}
        </Label>
        {admin ? (
          <>
            <Controller
              name="timezone"
              control={control}
              render={({ field }) => (
                <SelectField
                  id="sla-timezone"
                  value={field.value}
                  onValueChange={field.onChange}
                  options={INSTANCE_TIMEZONE_OPTIONS}
                />
              )}
            />
            <p className="text-xs text-muted-foreground">
              {t('sla.timezoneHint')}
            </p>
          </>
        ) : (
          <p id="sla-timezone" className="text-sm tabular-nums">
            {defaultValues.timezone}
          </p>
        )}
      </div>

      <div className="w-full overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>
                {t('sla.columns.priority')}
              </TableHead>
              <TableHead className="w-[12rem] sm:w-[14rem]">
                {t('sla.columns.firstResponseMinutes')}
              </TableHead>
              <TableHead className="w-[12rem] sm:w-[14rem]">
                {t('sla.columns.resolutionMinutes')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {defaultValues.targets.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={3}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t('sla.emptyTargets')}
                </TableCell>
              </TableRow>
            ) : (
              defaultValues.targets.map((target, index) => (
                <TableRow
                  key={target.priorityId}
                  className={cn(
                    'hover:bg-transparent',
                    ticketPrioritySurfaceClass(target.priorityCode),
                  )}
                >
                  <TableCell>
                    <TicketPriorityBadge
                      code={target.priorityCode}
                      label={target.priorityLabel}
                    />
                  </TableCell>
                  <TableCell>
                    <Controller
                      name={`targets.${index}.firstResponseMinutes`}
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          id={`sla-first-response-${target.priorityId}`}
                          type="number"
                          min={1}
                          aria-label={t(
                            'sla.columns.firstResponseMinutes',
                          )}
                          aria-invalid={Boolean(
                            errors.targets?.[index]?.firstResponseMinutes,
                          )}
                          className="h-8 max-w-[10rem] bg-background/80 tabular-nums"
                          disabled={!admin}
                        />
                      )}
                    />
                  </TableCell>
                  <TableCell>
                    <Controller
                      name={`targets.${index}.resolutionMinutes`}
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          id={`sla-resolution-${target.priorityId}`}
                          type="number"
                          min={1}
                          aria-label={t(
                            'sla.columns.resolutionMinutes',
                          )}
                          aria-invalid={Boolean(
                            errors.targets?.[index]?.resolutionMinutes,
                          )}
                          className="h-8 max-w-[10rem] bg-background/80 tabular-nums"
                          disabled={!admin}
                        />
                      )}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {admin ? (
        <div className="flex justify-end">
          <Button
            type="submit"
            size="sm"
            className="h-8 min-w-[8rem] px-3 text-xs shadow-none"
            disabled={
              isMutating ||
              defaultValues.targets.length === 0 ||
              !defaultValues.timezone
            }
          >
            {t('common.save')}
          </Button>
        </div>
      ) : null}
    </form>
  );
}
