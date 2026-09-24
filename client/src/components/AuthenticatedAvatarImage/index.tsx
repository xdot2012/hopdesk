import { AvatarImage } from '~/components/ui/avatar';
import useAuthenticatedFileUrl from '~/hooks/useAuthenticatedFileUrl';

type AuthenticatedAvatarImageProps = {
  src: string | null | undefined;
  alt?: string;
  className?: string;
};

export default function AuthenticatedAvatarImage({
  src,
  alt,
  className,
}: AuthenticatedAvatarImageProps) {
  const resolved = useAuthenticatedFileUrl(src);
  if (!resolved) return null;

  return <AvatarImage src={resolved} alt={alt} className={className} />;
}
