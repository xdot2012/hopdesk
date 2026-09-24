import {
  AlertCircle,
  CheckCircle,
  Info,
  TriangleAlert,
  X,
} from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export type NotificationSeverity = "info" | "success" | "warning" | "error";

export interface NotificationMessageProps {
  id: string;
  title: string;
  message?: string;
  text?: string;
  time?: string;
  created_at?: string;
  severity?: NotificationSeverity;
  unread?: boolean;
  link?: string;
  onClick: (id: string) => void;
  onDismiss?: (id: string) => void;
}

const SEVERITY_ICON = {
  info: Info,
  success: CheckCircle,
  warning: TriangleAlert,
  error: AlertCircle,
} as const;

const SEVERITY_COLOR = {
  info: "text-sky-400",
  success: "text-primary",
  warning: "text-amber-400",
  error: "text-destructive",
} as const;

export default function NotificationMessage({
  id,
  title,
  message,
  text,
  time,
  created_at,
  severity = "info",
  unread = false,
  onDismiss,
  onClick,
}: NotificationMessageProps) {
  const { t, i18n } = useTranslation();
  const body = message ?? text ?? "";

  const formatTime = (value?: string): string => {
    if (!value) return "";
    try {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return value;
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      if (diffMins < 1) return t('navbar.justNow');
      if (diffMins < 60) return t('navbar.minutesAgo', { count: diffMins });
      if (diffHours < 24) return t('navbar.hoursAgo', { count: diffHours });
      if (diffDays < 7) return t('navbar.daysAgo', { count: diffDays });
      return date.toLocaleDateString(i18n.language, {
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      });
    } catch {
      return value;
    }
  };

  const timeDisplay = formatTime(time ?? created_at);
  const Icon = SEVERITY_ICON[severity];
  const iconColor = SEVERITY_COLOR[severity];

  return (
    <button
      type="button"
      className={cn(
        "flex w-full max-w-[360px] items-start gap-3 border-b px-4 py-3 text-left transition-colors hover:bg-accent",
        unread && "border-l-4 border-l-primary bg-accent/50"
      )}
      onClick={() => onClick(id)}
    >
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", iconColor)} />
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm", unread ? "font-semibold" : "font-normal")}>{title}</p>
        {body && <p className="mt-1 text-sm text-muted-foreground">{body}</p>}
        {timeDisplay && <p className="mt-1 text-xs text-muted-foreground">{timeDisplay}</p>}
      </div>
      {onDismiss && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          aria-label={t('navbar.dismiss')}
          onClick={(e) => {
            e.stopPropagation();
            onDismiss(id);
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </button>
  );
}
