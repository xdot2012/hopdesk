import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover';

type KnowledgeBaseLinkPopoverProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialUrl?: string;
  onApply: (url: string) => void;
  onRemove?: () => void;
  children: React.ReactNode;
};

export default function KnowledgeBaseLinkPopover({
  open,
  onOpenChange,
  initialUrl = '',
  onApply,
  onRemove,
  children,
}: KnowledgeBaseLinkPopoverProps) {
  const { t } = useTranslation();
  const [url, setUrl] = useState(initialUrl);

  useEffect(() => {
    if (open) {
      setUrl(initialUrl || 'https://');
    }
  }, [open, initialUrl]);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-80 space-y-3" align="start">
        <div className="space-y-2">
          <Label htmlFor="kb-link-url">{t('knowledgeBase.linkUrl')}</Label>
          <Input
            id="kb-link-url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://"
          />
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => {
              onApply(url.trim());
              onOpenChange(false);
            }}
          >
            {t('knowledgeBase.linkApply')}
          </Button>
          {onRemove && (
            <Button type="button" size="sm" variant="outline" onClick={onRemove}>
              {t('knowledgeBase.linkRemove')}
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
