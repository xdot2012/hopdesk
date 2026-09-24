import { Lock, LockOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip';
import { cn } from '~/lib/utils';

type KnowledgeBaseVisibilityLockProps = {
  staffOnly: boolean;
  onToggle: () => void;
  className?: string;
};

export default function KnowledgeBaseVisibilityLock({
  staffOnly,
  onToggle,
  className,
}: KnowledgeBaseVisibilityLockProps) {
  const { t } = useTranslation();
  const label = staffOnly
    ? t('knowledgeBase.visibility.staff')
    : t('knowledgeBase.visibility.public');

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            'mt-1.5 shrink-0 rounded-md p-1 transition-colors hover:bg-muted',
            staffOnly
              ? 'text-foreground hover:text-foreground'
              : 'text-muted-foreground/60 hover:text-muted-foreground/80',
            className,
          )}
          aria-label={t('knowledgeBase.visibilityPrivate')}
          aria-pressed={staffOnly}
        >
          {staffOnly ? (
            <Lock className="h-4 w-4" aria-hidden />
          ) : (
            <LockOpen className="h-4 w-4" aria-hidden />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
