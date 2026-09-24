import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '~/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { cn } from '~/lib/utils';

type KnowledgeBaseSaveButtonProps = {
  disabled?: boolean;
  className?: string;
  onSaveDraft: () => void;
};

export default function KnowledgeBaseSaveButton({
  disabled = false,
  className,
  onSaveDraft,
}: KnowledgeBaseSaveButtonProps) {
  const { t } = useTranslation();

  return (
    <div className={cn('flex w-full', className)}>
      <Button type="submit" className="flex-1 rounded-r-none" disabled={disabled}>
        {t('knowledgeBase.save')}
      </Button>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            className="rounded-l-none border-l border-primary-foreground/20 px-2.5"
            disabled={disabled}
            aria-label={t('knowledgeBase.saveOptions')}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[12rem]">
          <DropdownMenuItem
            onClick={(event) => {
              event.preventDefault();
              onSaveDraft();
            }}
          >
            {t('knowledgeBase.saveAsDraft')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
