import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Controller, useForm } from 'react-hook-form';
import { useCreateSector } from '~/api/sector/manageSector';
import ColorPickerField from '~/components/ColorPickerField';
import { Button } from '~/components/ui/button';
import { DialogFooter } from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { useAlertStore } from '~/store';
import { getApiErrorMessage } from '~/util/functions';
import { DEFAULT_SECTOR_COLOR } from '../../SectorSwatch';
import { sectorSchema, type SectorFormType } from '../schema';

type Props = {
  onCreated: () => Promise<unknown>;
  onCancel: () => void;
};

export default function SectorForm({ onCreated, onCancel }: Props) {
  const { t } = useTranslation();
  const { showErrorSnack, showSuccessSnack } = useAlertStore();
  const { trigger: createSector, isMutating } = useCreateSector();
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm<SectorFormType>({
    mode: 'onChange',
    resolver: zodResolver(sectorSchema),
    defaultValues: { name: '', color: DEFAULT_SECTOR_COLOR },
  });
  const color = watch('color');

  const onSubmit = async (values: SectorFormType) => {
    try {
      await createSector(values);
      await onCreated();
      showSuccessSnack(t('sectors.sectorCreated'));
    } catch (error: unknown) {
      showErrorSnack(
        getApiErrorMessage(error, t('sectors.sectorCreateError')),
      );
    }
  };

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
      <div className="space-y-2">
        <Label htmlFor="sector-name">{t('sectors.sectorName')}</Label>
        <Input
          id="sector-name"
          {...register('name')}
          aria-invalid={Boolean(errors.name)}
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="sector-color">{t('sectors.sectorColor')}</Label>
        <div className="flex items-center gap-3">
          <Controller
            name="color"
            control={control}
            render={({ field }) => (
              <ColorPickerField
                value={field.value}
                onChange={field.onChange}
                size="default"
                aria-label={t('sectors.sectorColor')}
              />
            )}
          />
          <span className="text-sm text-muted-foreground">{color}</span>
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={isMutating || !isValid}>
          {t('sectors.createSector')}
        </Button>
      </DialogFooter>
    </form>
  );
}
