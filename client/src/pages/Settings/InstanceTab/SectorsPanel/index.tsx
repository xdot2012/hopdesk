import { useMemo, useRef, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useListSectors, { type Sector } from '~/api/sector/listSectors';
import {
  useDeleteSector,
  useUpdateSector,
} from '~/api/sector/manageSector';
import ButtonWithDialog from '~/components/ButtonWithDialog';
import DataTable, { type ColumnDef } from '~/components/DataTable';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { useAlertStore } from '~/store';
import { getApiErrorMessage } from '~/util/functions';
import SectorInlineEditor from '../SectorInlineEditor';
import SectorSwatch, { DEFAULT_SECTOR_COLOR } from '../SectorSwatch';
import SectorForm from './Form';
import { sectorSchema } from './schema';

export default function SectorsPanel() {
  const { t } = useTranslation();
  const { showErrorSnack, showSuccessSnack } = useAlertStore();
  const { sectors, mutate } = useListSectors();
  const { trigger: updateSector, isMutating: updatingSector } =
    useUpdateSector();
  const { trigger: deleteSector, isMutating: deletingSector } =
    useDeleteSector();
  const [createSectorOpen, setCreateSectorOpen] = useState(false);
  const [createFormKey, setCreateFormKey] = useState(0);
  const [editingSectorId, setEditingSectorId] = useState<string | null>(null);
  const [editingSectorName, setEditingSectorName] = useState('');
  const editingSectorColorRef = useRef(DEFAULT_SECTOR_COLOR);

  const closeCreateForm = () => {
    setCreateSectorOpen(false);
    setCreateFormKey((current) => current + 1);
  };

  const onSaveSector = async (sectorId: string) => {
    const result = sectorSchema.safeParse({
      name: editingSectorName,
      color: editingSectorColorRef.current,
    });
    if (!result.success) return;
    try {
      await updateSector({ sectorId, ...result.data });
      setEditingSectorId(null);
      setEditingSectorName('');
      editingSectorColorRef.current = DEFAULT_SECTOR_COLOR;
      await mutate();
      showSuccessSnack(t('sectors.sectorUpdated'));
    } catch (error: unknown) {
      showErrorSnack(
        getApiErrorMessage(error, t('sectors.sectorUpdateError')),
      );
    }
  };

  const onDeleteSector = async (sectorId: string) => {
    try {
      await deleteSector({ sectorId });
      await mutate();
      showSuccessSnack(t('sectors.sectorDeleted'));
    } catch (error: unknown) {
      showErrorSnack(
        getApiErrorMessage(error, t('sectors.sectorDeleteError')),
      );
    }
  };

  const sectorColumns = useMemo<ColumnDef<Sector>[]>(
    () => [
      {
        accessorKey: 'name',
        header: t('sectors.sectorName'),
        cell: ({ row }) => {
          const sector = row.original;
          if (editingSectorId === sector.id) {
            return (
              <SectorInlineEditor
                key={sector.id}
                name={editingSectorName}
                color={editingSectorColorRef.current}
                onNameChange={setEditingSectorName}
                onColorChange={(color) => {
                  editingSectorColorRef.current = color;
                }}
              />
            );
          }
          return (
            <div className="flex items-center gap-2">
              <SectorSwatch color={sector.color} label={sector.name} />
              <span>{sector.name}</span>
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: () => (
          <span className="block text-right">{t('sectors.actions')}</span>
        ),
        enableSorting: false,
        cell: ({ row }) => {
          const sector = row.original;
          return (
            <div
              className="flex justify-end gap-2"
              onClick={(event) => event.stopPropagation()}
            >
              {editingSectorId === sector.id ? (
                <>
                  <Button
                    type="button"
                    size="sm"
                    disabled={
                      updatingSector ||
                      !sectorSchema.safeParse({
                        name: editingSectorName,
                        color: editingSectorColorRef.current,
                      }).success
                    }
                    onClick={() => onSaveSector(sector.id)}
                  >
                    {t('common.save')}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingSectorId(null)}
                  >
                    {t('common.cancel')}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingSectorId(sector.id);
                      setEditingSectorName(sector.name);
                      editingSectorColorRef.current =
                        sector.color || DEFAULT_SECTOR_COLOR;
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">
                      {t('sectors.editSector')}
                    </span>
                  </Button>
                  <ButtonWithDialog
                    size="sm"
                    variant="outline"
                    dialogTitle={t('sectors.deleteSectorTitle')}
                    dialogText={t('sectors.deleteSectorDescription')}
                    disabled={deletingSector}
                    onConfirm={() => onDeleteSector(sector.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">
                      {t('sectors.deleteSector')}
                    </span>
                  </ButtonWithDialog>
                </>
              )}
            </div>
          );
        },
      },
    ],
    [
      deletingSector,
      editingSectorId,
      editingSectorName,
      t,
      updatingSector,
    ],
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">
          {t('sectors.sectorsTitle')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t('sectors.sectorsHint')}
        </p>
      </div>
      <DataTable
        columns={sectorColumns}
        data={sectors}
        searchColumn="name"
        searchPlaceholder={t('sectors.searchSectors')}
        emptyMessage={t('sectors.sectorsEmpty')}
        pageSize={10}
        syncPageToUrl
        toolbarEnd={
          <Button type="button" onClick={() => setCreateSectorOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('sectors.createSector')}
          </Button>
        }
      />
      <Dialog
        open={createSectorOpen}
        onOpenChange={(open) =>
          open ? setCreateSectorOpen(true) : closeCreateForm()
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('sectors.createSector')}</DialogTitle>
            <DialogDescription>
              {t('sectors.createSectorDescription')}
            </DialogDescription>
          </DialogHeader>
          <SectorForm
            key={createFormKey}
            onCancel={closeCreateForm}
            onCreated={async () => {
              await mutate();
              closeCreateForm();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
