import { RouterProvider } from 'react-router-dom';
import SnackMessage from './components/SnackMessage';
import { Toaster } from './components/ui/sonner';
import { TooltipProvider } from './components/ui/tooltip';
import ColorModeContext from './context/ColorModeContext';
import useColorModeTheme from './hooks/useTheme';
import router from './router';
import { useAlertStore } from './store';

export default function App() {
  const { showSnack, snackSeverity, snakVariant, snackMessage, closeSnack } = useAlertStore((state) => state);
  const { colorMode } = useColorModeTheme();

  return (
    <ColorModeContext.Provider value={colorMode}>
      <TooltipProvider>
        <RouterProvider router={router} />
        <SnackMessage
          open={showSnack}
          handleClose={closeSnack}
          severity={snackSeverity}
          variant={snakVariant}
        >
          {snackMessage}
        </SnackMessage>
        <Toaster position="bottom-center" />
      </TooltipProvider>
    </ColorModeContext.Provider>
  );
}
