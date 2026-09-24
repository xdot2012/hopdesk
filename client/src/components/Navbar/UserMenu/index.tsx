import { LogOut, Settings } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import useSignOut from '~/api/auth/signOut';
import AuthenticatedAvatarImage from '~/components/AuthenticatedAvatarImage';
import { Avatar, AvatarFallback } from '~/components/ui/avatar';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { LOGOUT, USER_SETTINGS } from '~/router/paths';
import { useUserStore } from '~/store';

function getUserInitials(name?: string | null, email?: string) {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }

  const localPart = email?.split('@')[0] ?? 'U';
  return localPart.slice(0, 2).toUpperCase();
}

export default function UserMenu() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { trigger: signOut } = useSignOut();
  const { profile } = useUserStore();
  const [logoutOpen, setLogoutOpen] = useState(false);

  const displayName = profile?.name?.trim() || profile?.email?.split('@')[0] || t('common.user');
  const initials = getUserInitials(profile?.name, profile?.email);

  const handleLogout = () => {
    signOut();
    navigate(LOGOUT);
    setLogoutOpen(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="cursor-pointer rounded-full"
            aria-label={t('navbar.openAccountMenu')}
          >
            <Avatar className="h-9 w-9">
              {profile?.avatarUrl && (
                <AuthenticatedAvatarImage src={profile.avatarUrl} alt={displayName} />
              )}
              <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-0.5">
              <span className="font-medium text-foreground">{displayName}</span>
              {profile?.email && (
                <span className="truncate text-xs text-muted-foreground">{profile.email}</span>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link to={USER_SETTINGS} className="flex cursor-pointer items-center gap-2">
              <Settings className="h-4 w-4" />
              {t('userSettings.menuLabel')}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer text-destructive focus:text-destructive"
            onClick={() => setLogoutOpen(true)}
          >
            <LogOut className="h-4 w-4" />
            {t('navbar.logout')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('navbar.logoutTitle')}</DialogTitle>
            <DialogDescription>{t('navbar.logoutDescription')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogoutOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleLogout} autoFocus>
              {t('navbar.logout')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
