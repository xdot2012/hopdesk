import { Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "~/components/ui/button";
import { useColorMode } from "~/hooks/useTheme";

export default function ChangeModeButton() {
  const { mode, toggleColorMode } = useColorMode();
  const { t } = useTranslation();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleColorMode}
      aria-label={t('theme.toggleAria')}
    >
      {mode === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  );
}
