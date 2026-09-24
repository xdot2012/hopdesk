import { useContext, useEffect, useMemo, useState } from 'react';
import { ColorModes } from '~/util/constants';
import ColorModeContext from '~/context/ColorModeContext';

type PaletteMode = 'light' | 'dark';

function useColorModeTheme() {
  const getUserColorMode = (): PaletteMode => {
    const userColorMode = localStorage.getItem('color-mode');
    if (userColorMode === ColorModes.DARK) {
      return 'dark';
    }
    return 'light';
  };

  const [mode, setMode] = useState<PaletteMode>(getUserColorMode);

  useEffect(() => {
    const root = document.documentElement;
    if (mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [mode]);

  const colorMode = useMemo(
    () => ({
      mode,
      toggleColorMode: () => {
        setMode((prevMode) => {
          const nextMode = prevMode === 'light' ? 'dark' : 'light';
          localStorage.setItem('color-mode', nextMode);
          return nextMode;
        });
      },
    }),
    [mode],
  );

  return { mode, colorMode };
}

export function useColorMode() {
  return useContext(ColorModeContext);
}

export default useColorModeTheme;
