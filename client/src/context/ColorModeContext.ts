import React from "react";

type ColorModeContextValue = {
  mode: 'light' | 'dark';
  toggleColorMode: () => void;
};

const ColorModeContext = React.createContext<ColorModeContextValue>({
  mode: 'light',
  toggleColorMode: () => {},
});

export default ColorModeContext;
