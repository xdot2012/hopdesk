import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useListSectors from '~/api/sector/listSectors';
import {
  type ManagedUser,
  type ManagedUserRole,
  useListUsers,
  useUpdateUserRole,
} from '~/api/user/listUsers';
import useListUserSectors, {
  type UserSector,
  useAddUserSector,
  useUpdateUserSector,
} from '~/api/userSector';
import DataTable, { type ColumnDef } from '~/components/DataTable';
import SelectField from '~/components/SelectField';
import AuthenticatedAvatarImage from '~/components/AuthenticatedAvatarImage';
import { Avatar, AvatarFallback } from '~/components/ui/avatar';
import { Switch } from '~/components/ui/switch';
import { useAlertStore, useUserStore } from '~/store';
import { ROLE_ADMIN, ROLE_AGENT, ROLE_CUSTOMER } from '~/util/roles';
import { getApiErrorMessage } from '~/util/functions';

const ALL_ROLES_FILTER = '';
const NO_SECTOR_FILTER = '__none__';

type UserRow = ManagedUser & {
  userSector: UserSector | null;
};

function userInitials(name?: string | null, email?: string | null) {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }

  const localPart = email?.split('@')[0] ?? '?';
  return localPart.slice(0, 2).toUpperCase();
}

export default function UsersTab() {
  const { t } = useTranslation();
  const { profile } = useUserStore();
  const { showErrorSnack, showSuccessSnack } = useAlertStore();
  const { users, mutate: mutateUsers, isLoading: loadingUsers } = useListUsers();
  const { sectors, mutate: mutateSectors } = useListSectors();
  const {
    userSectors,
    mutate: mutateUserSectors,
    isLoading: loadingUserSectors,
  } = useListUserSectors();
  const { trigger: updateUserRole, isMutating: updatingRole } = useUpdateUserRole();
  const { trigger: addUserSector, isMutating: addingUserSector } = useAddUserSector();
  const { trigger: updateUserSector, isMutating: updatingUserSector } = useUpdateUserSector();
  const [roleFilter, setRoleFilter] = useState(ALL_ROLES_FILTER);
  const [sectorFilter, setSectorFilter] = useState('');
  const updatingRoleRef = useRef(updatingRole);
  updatingRoleRef.current = updatingRole;
  const mutatingSectorRef = useRef(false);
  mutatingSectorRef.current = addingUserSector || updatingUserSector;

  const onChanged = async () => {
    await Promise.all([mutateUsers(), mutateUserSectors(), mutateSectors()]);
  };

  const membershipByUserId = useMemo(() => {
    const map = new Map<string, UserSector>();
    for (const row of userSectors) {
      map.set(row.userId, row);
    }
    return map;
  }, [userSectors]);

  const rows = useMemo<UserRow[]>(
    () =>
      users.map((user) => ({
        ...user,
        userSector: membershipByUserId.get(user.id) ?? null,
      })),
    [users, membershipByUserId],
  );

  const roleOptions = useMemo(
    () => [
      { value: ROLE_CUSTOMER, label: t('users.roles.customer') },
      { value: ROLE_AGENT, label: t('users.roles.agent') },
    ],
    [t],
  );

  const roleFilterOptions = useMemo(
    () => [
      { value: ALL_ROLES_FILTER, label: t('users.allRoles') },
      ...roleOptions,
      { value: ROLE_ADMIN, label: t('users.roles.admin') },
    ],
    [roleOptions, t],
  );

  const sectorOptions = useMemo(
    () => [
      { value: '', label: t('users.noSector') },
      ...sectors.map((sector) => ({
        value: sector.id,
        label: sector.name,
      })),
    ],
    [sectors, t],
  );

  const sectorFilterOptions = useMemo(
    () => [
      { value: '', label: t('users.allSectors') },
      { value: NO_SECTOR_FILTER, label: t('users.noSector') },
      ...sectors.map((sector) => ({
        value: sector.id,
        label: sector.name,
      })),
    ],
    [sectors, t],
  );

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (roleFilter && row.role !== roleFilter) return false;
      if (!sectorFilter) return true;
      if (row.role !== ROLE_CUSTOMER) return false;
      const sectorId = row.userSector?.sectorId ?? null;
      if (sectorFilter === NO_SECTOR_FILTER) return !sectorId;
      return sectorId === sectorFilter;
    });
  }, [rows, roleFilter, sectorFilter]);

  const onChangeRole = async (userId: string, role: ManagedUserRole) => {
    try {
      await updateUserRole({ userId, role });
      await onChanged();
      showSuccessSnack(t('users.roleUpdated'));
    } catch (error: unknown) {
      showErrorSnack(getApiErrorMessage(error, t('users.roleUpdateError')));
    }
  };

  const onToggleAdmin = async (userId: string, checked: boolean) => {
    await onChangeRole(userId, checked ? ROLE_ADMIN : ROLE_AGENT);
  };

  const onAssignSector = async (user: UserRow, sectorId: string) => {
    try {
      if (user.userSector) {
        await updateUserSector({
          userSectorId: user.userSector.id,
          sectorId: sectorId || null,
          isSectorManager: sectorId ? undefined : false,
        });
      } else if (sectorId) {
        await addUserSector({ userId: user.id, sectorId });
      } else {
        return;
      }
      await onChanged();
      showSuccessSnack(t('users.sectorUpdated'));
    } catch (error: unknown) {
      showErrorSnack(getApiErrorMessage(error, t('users.sectorUpdateError')));
    }
  };

  const onToggleManager = async (membership: UserSector, checked: boolean) => {
    if (!membership.sectorId) return;
    try {
      await updateUserSector({
        userSectorId: membership.id,
        sectorId: membership.sectorId,
        isSectorManager: checked,
      });
      await onChanged();
      showSuccessSnack(t('users.sectorUpdated'));
    } catch (error: unknown) {
      showErrorSnack(getApiErrorMessage(error, t('users.sectorUpdateError')));
    }
  };

  const columns = useMemo<ColumnDef<UserRow>[]>(
    () => [
      {
        id: 'avatar',
        accessorFn: (row) => row.name || row.email || row.id,
        header: () => <span className="sr-only">{t('users.avatar')}</span>,
        enableSorting: false,
        cell: ({ row }) => {
          const user = row.original;
          const label = user.name || user.email || user.id;
          return (
            <Avatar className="h-8 w-8">
              {user.avatarUrl ? (
                <AuthenticatedAvatarImage src={user.avatarUrl} alt={label} />
              ) : null}
              <AvatarFallback className="bg-primary/10 text-[10px] font-medium text-primary">
                {userInitials(user.name, user.email)}
              </AvatarFallback>
            </Avatar>
          );
        },
      },
      {
        id: 'name',
        accessorFn: (row) => [row.name, row.email, row.id].filter(Boolean).join(' '),
        header: t('users.name'),
        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.name?.trim() || t('users.nameEmpty')}
          </span>
        ),
      },
      {
        id: 'email',
        accessorFn: (row) => row.email || '',
        header: t('common.email'),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.original.email || '—'}</span>
        ),
      },
      {
        id: 'role',
        accessorFn: (row) => row.role || '',
        header: t('users.role'),
        enableSorting: false,
        cell: ({ row }) => {
          const user = row.original;
          const isSelf = user.id === profile?.id;
          const rawRole = (user.role as ManagedUserRole | null | undefined) ?? ROLE_CUSTOMER;
          const displayRole = rawRole === ROLE_ADMIN ? ROLE_AGENT : rawRole;
          return (
            <div className="max-w-xs" onClick={(event) => event.stopPropagation()}>
              <SelectField
                size="sm"
                value={displayRole}
                onValueChange={(value) => onChangeRole(user.id, value as ManagedUserRole)}
                options={roleOptions}
                disabled={isSelf || updatingRoleRef.current}
                aria-label={t('users.role')}
              />
              {isSelf ? (
                <p className="mt-1 text-xs text-muted-foreground">{t('users.ownRoleHint')}</p>
              ) : null}
            </div>
          );
        },
      },
      {
        id: 'sector',
        accessorFn: (row) => row.userSector?.sectorName || '',
        header: t('users.sector'),
        enableSorting: false,
        cell: ({ row }) => {
          const user = row.original;
          if (user.role !== ROLE_CUSTOMER) {
            return <span className="text-sm text-muted-foreground">—</span>;
          }
          return (
            <div className="max-w-xs" onClick={(event) => event.stopPropagation()}>
              <SelectField
                size="sm"
                value={user.userSector?.sectorId ?? ''}
                onValueChange={(value) => onAssignSector(user, value)}
                options={sectorOptions}
                disabled={mutatingSectorRef.current}
                aria-label={t('users.sector')}
              />
            </div>
          );
        },
      },
      {
        id: 'manager',
        accessorFn: (row) => {
          if (row.role === ROLE_ADMIN) return 1;
          if (row.role === ROLE_CUSTOMER && row.userSector?.isSectorManager) return 1;
          return 0;
        },
        header: t('users.manager'),
        enableSorting: false,
        cell: ({ row }) => {
          const user = row.original;
          const isSelf = user.id === profile?.id;
          const isStaff = user.role === ROLE_AGENT || user.role === ROLE_ADMIN;

          if (isStaff) {
            return (
              <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
                <Switch
                  checked={user.role === ROLE_ADMIN}
                  disabled={isSelf || updatingRoleRef.current}
                  onCheckedChange={(checked) => onToggleAdmin(user.id, checked)}
                  aria-label={t('users.administrator')}
                />
              </div>
            );
          }

          if (user.role !== ROLE_CUSTOMER) {
            return <span className="text-sm text-muted-foreground">—</span>;
          }

          const membership = user.userSector;
          const enabled = Boolean(membership?.sectorId);
          if (!membership) {
            return <span className="text-sm text-muted-foreground">—</span>;
          }
          return (
            <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
              <Switch
                checked={Boolean(membership.isSectorManager) && enabled}
                disabled={!enabled || mutatingSectorRef.current}
                onCheckedChange={(checked) => onToggleManager(membership, checked)}
                aria-label={t('users.sectorManager')}
              />
            </div>
          );
        },
      },
    ],
    [t, roleOptions, sectorOptions, profile?.id],
  );

  const isLoading = (loadingUsers || loadingUserSectors) && users.length === 0;

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">{t('users.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('users.subtitle')}</p>
      </div>
      <DataTable
        columns={columns}
        data={filteredRows}
        searchColumn="name"
        searchPlaceholder={t('users.search')}
        emptyMessage={t('users.empty')}
        pageSize={10}
        syncPageToUrl
        paginationResetKey={`${roleFilter}:${sectorFilter}`}
        toolbarFilters={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <SelectField
              size="sm"
              value={roleFilter}
              onValueChange={setRoleFilter}
              options={roleFilterOptions}
              className="w-full sm:w-44"
              aria-label={t('users.filterByRole')}
            />
            <SelectField
              size="sm"
              value={sectorFilter}
              onValueChange={setSectorFilter}
              options={sectorFilterOptions}
              className="w-full sm:w-52"
              aria-label={t('users.filterBySector')}
            />
          </div>
        }
      />
    </div>
  );
}
