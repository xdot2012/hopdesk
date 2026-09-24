import useAuthenticatedFileUrl from '~/hooks/useAuthenticatedFileUrl';
import { cn } from '~/lib/utils';

type AuthenticatedImageProps = {
  src: string | null | undefined;
  alt?: string;
  className?: string;
  title?: string;
};

export default function AuthenticatedImage({
  src,
  alt = '',
  className,
  title,
}: AuthenticatedImageProps) {
  const resolved = useAuthenticatedFileUrl(src);
  if (!resolved) return null;

  return <img src={resolved} alt={alt} title={title} className={cn(className)} />;
}
