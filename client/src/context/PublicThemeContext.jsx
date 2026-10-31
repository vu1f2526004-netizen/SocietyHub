import React from 'react';
import { ThemeContext, ThemeProvider, useTheme } from './ThemeContext';

export const PublicThemeProvider = ({ children }) => {
  return <>{children}</>;
};

export const usePublicTheme = () => useTheme();

export default ThemeContext;
