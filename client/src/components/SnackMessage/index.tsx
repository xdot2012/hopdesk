import { ReactNode, useEffect } from 'react';
import { toast } from 'sonner';

interface Props {
  children?: ReactNode;
  open: boolean;
  severity: 'success' | 'warning' | 'error' | 'info';
  variant: 'filled' | 'outlined' | 'standard';
  handleClose: () => void;
}

export default function SnackMessage({ children, open, severity, handleClose }: Props) {
  useEffect(() => {
    if (!open) return;

    const message = String(children ?? '').trim();
    if (!message) {
      handleClose();
      return;
    }

    const toastFn =
      severity === 'success'
        ? toast.success
        : severity === 'error'
          ? toast.error
          : severity === 'warning'
            ? toast.warning
            : toast.info;

    toastFn(message, { onDismiss: handleClose, onAutoClose: handleClose });
    handleClose();
  }, [open, severity, children, handleClose]);

  return null;
}
