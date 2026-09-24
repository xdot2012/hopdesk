import { AxiosError } from 'axios'
import { create } from 'zustand'
import { getApiErrorMessage } from '~/util/functions'

type AlertStore = {
    show: boolean
    message: string
    severity: 'success' | 'warning' | 'error' | 'info'
    variant: 'filled' | 'outlined' | 'standard'
    showSnack: boolean
    snackMessage: string
    snackSeverity: 'success' | 'warning' | 'error' | 'info'
    snakVariant: 'filled' | 'outlined' | 'standard'
    showError: (error: AxiosError | string | unknown) => void
    showErrorMessage: (newMessage: string) => void
    showSuccessMessage: (newMessage: string) => void
    showErrorSnack: (error: string | unknown) => void
    showSuccessSnack: (newMessage: string) => void
    closeSnack: () => void
    closeMessage: () => void
  }

const useAlertStore = create<AlertStore>((set) => ({
  show: false,
  message: '',
  variant: 'filled',
  severity: 'success',
  showSnack: false,
  snackMessage: '',
  snakVariant: 'filled',
  snackSeverity: 'success',
  showErrorSnack: (error: string | unknown) => {
    const snackMessage = getApiErrorMessage(error);
    if (!snackMessage) return;
    set(() => ({
      snackMessage,
      snakVariant: 'filled',
      snackSeverity: 'error',
      showSnack: true,
    }));
  },
  showSuccessSnack: (newMessage: string) => {
    set(() => ({
      snackMessage: newMessage,
      snakVariant: 'filled',
      snackSeverity: 'success',
      showSnack: true,
    }));
  },
  showSuccessMessage: (newMessage: string) => {
    set(() => ({
      message: newMessage,
      variant: 'standard',
      severity: 'success',
      show: true,
    }));
  },
  showErrorMessage: (newMessage: string) => {
    set(() => ({
      message: newMessage,
      variant: 'standard',
      severity: 'error',
      show: true,
    }));
  },
  closeSnack: () => {
    set(() => ({
      showSnack: false
    }))
  },
  closeMessage: () => {
    set(() => ({
      show: false
    }))
  },
  showError: (err: AxiosError | string | unknown) => {
    const newMessage = getApiErrorMessage(err);
    set(() => ({
      message: newMessage,
      variant: 'standard',
      severity: 'error',
      show: true,
      // Também exibe toast: páginas do dashboard não têm PageMessage
      snackMessage: newMessage,
      snakVariant: 'filled',
      snackSeverity: 'error',
      showSnack: true,
    }));
  }
}))

export default useAlertStore;
