import LogoMark from '~/components/brand/LogoMark';
import LogoWordmark from '~/components/brand/LogoWordmark';
import { useTranslation } from 'react-i18next';
import { cn } from '~/lib/utils';

interface AppLogoProps {
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeConfig = {
  sm: { mark: 'h-8 w-8', wordmark: 'text-lg' },
  md: { mark: 'h-10 w-10', wordmark: 'text-xl' },
  lg: { mark: 'h-12 w-12', wordmark: 'text-2xl' },
  xl: { mark: 'h-14 w-14', wordmark: 'text-3xl' },
};

export default function AppLogo({
  showText = true,
  size = 'md',
  className,
}: AppLogoProps) {
  const { t } = useTranslation();
  const config = sizeConfig[size];
  const alt = t('logo.alt');

  if (!showText) {
    return (
      <div
        className={cn('shrink-0', config.mark, className)}
        role="img"
        aria-label={alt}
      >
        <LogoMark className="h-full w-full" />
      </div>
    );
  }

  return (
    <div
      className={cn('flex items-center gap-2.5', className)}
      role="img"
      aria-label={alt}
    >
      <LogoMark className={cn('shrink-0', config.mark)} />
      <LogoWordmark className={config.wordmark} />
    </div>
  );
}
