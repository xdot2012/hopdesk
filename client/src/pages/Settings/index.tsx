import { useMemo } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSearchTab } from '~/hooks';
import { SETTINGS } from '~/router/paths';
import { useUserStore } from '~/store';
import { isAdminRole, isAgentRole } from '~/util/roles';
import { Card, CardContent } from '~/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import InstanceTab from './InstanceTab';
import NotificationsTab from './NotificationsTab';
import SlaTab from './SlaTab';
import UsersTab from './UsersTab';

const ADMIN_TABS = ['sla', 'users', 'instance', 'notifications'] as const;
const AGENT_TABS = ['sla'] as const;
const LEGACY_USER_TABS = new Set(['agents', 'members']);

type SettingsTab = (typeof ADMIN_TABS)[number];

function defaultSettingsTab(admin: boolean, agent: boolean): SettingsTab {
  if (agent || admin) return 'sla';
  return 'instance';
}

export default function Settings() {
  const { t } = useTranslation();
  const { profile } = useUserStore();
  const [searchParams] = useSearchParams();
  const admin = isAdminRole(profile?.role);
  const agent = isAgentRole(profile?.role);
  const tabs = admin ? ADMIN_TABS : agent ? AGENT_TABS : ADMIN_TABS;
  const defaultTab = useMemo(() => defaultSettingsTab(admin, agent), [admin, agent]);
  const { value, setTab } = useSearchTab({ tabs, defaultTab });

  const rawTab = searchParams.get('tab');
  if (rawTab && LEGACY_USER_TABS.has(rawTab)) {
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'users');
    return <Navigate to={`${SETTINGS}?${next.toString()}`} replace />;
  }

  const hasTabs = admin || agent;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('settings.title')}</h1>
        <p className="text-muted-foreground">{t('settings.subtitle')}</p>
      </div>

      {!hasTabs ? (
        <p className="text-sm text-muted-foreground">{t('settings.noInstanceSettings')}</p>
      ) : (
        <Card className="w-full">
          <CardContent className="p-4 md:p-6">
            <Tabs value={value} onValueChange={setTab}>
              <TabsList className="mb-4 flex h-auto flex-wrap gap-1">
                {admin || agent ? (
                  <TabsTrigger value="sla">{t('settings.tabs.sla')}</TabsTrigger>
                ) : null}
                {admin ? (
                  <>
                    <TabsTrigger value="users">{t('settings.tabs.users')}</TabsTrigger>
                    <TabsTrigger value="instance">{t('settings.tabs.sectors')}</TabsTrigger>
                    <TabsTrigger value="notifications">
                      {t('settings.tabs.notifications')}
                    </TabsTrigger>
                  </>
                ) : null}
              </TabsList>
              {admin || agent ? (
                <TabsContent value="sla">
                  <SlaTab />
                </TabsContent>
              ) : null}
              {admin ? (
                <>
                  <TabsContent value="users">
                    <UsersTab />
                  </TabsContent>
                  <TabsContent value="instance">
                    <InstanceTab />
                  </TabsContent>
                  <TabsContent value="notifications">
                    <NotificationsTab />
                  </TabsContent>
                </>
              ) : null}
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
