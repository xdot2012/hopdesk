import { getFileTypeIcon } from '~/lib/fileVisuals';
import { cn } from '~/lib/utils';

type Props = {
  contentType: string;
  className?: string;
};

export default function FileTypeIcon({ contentType, className }: Props) {
  const Icon = getFileTypeIcon(contentType);
  return <Icon className={cn('h-5 w-5', className)} />;
}
