import { useTranslation } from 'react-i18next';
import { useSearchTab } from '~/hooks';
import { Card, CardContent } from '~/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { cn } from '~/lib/utils';
import PreferencesTab from '~/pages/Settings/PreferencesTab';
import ProfileTab from '~/pages/Settings/ProfileTab';
import SecurityTab from '~/pages/Settings/SecurityTab';

const TAB_VALUES = ['profile', 'security', 'preferences'] as const;

export default function UserSettingsPage() {
  const { t } = useTranslation();
  const { value, setTab } = useSearchTab({ tabs: TAB_VALUES });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('userSettings.title')}</h1>
        <p className="text-muted-foreground">{t('userSettings.subtitle')}</p>
      </div>

      <div className={cn('flex justify-center')}>
        <Card className="w-full max-w-2xl">
          <CardContent className="p-4">
            <Tabs value={value} onValueChange={setTab}>
              <TabsList className="mb-4 flex h-auto flex-wrap gap-1">
                <TabsTrigger value="profile">{t('settings.tabs.profile')}</TabsTrigger>
                <TabsTrigger value="security">{t('settings.tabs.security')}</TabsTrigger>
                <TabsTrigger value="preferences">{t('settings.tabs.preferences')}</TabsTrigger>
              </TabsList>
              <TabsContent value="profile">
                <ProfileTab />
              </TabsContent>
              <TabsContent value="security">
                <SecurityTab />
              </TabsContent>
              <TabsContent value="preferences">
                <PreferencesTab />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
