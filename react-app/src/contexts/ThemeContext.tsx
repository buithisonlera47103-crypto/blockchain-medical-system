import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    // 从localStorage获取保存的主题，默认为light
    const savedTheme = localStorage.getItem('theme') as Theme;
    return savedTheme || 'light';
  });

  useEffect(() => {
    // 保存主题到localStorage
    localStorage.setItem('theme', theme);
    
    // 更新document的class来应用主题
    document.documentElement.className = theme;
    
    // 更新CSS变量
    if (theme === 'dark') {
      document.documentElement.style.setProperty('--bg-primary', '#1a1a1a');
      document.documentElement.style.setProperty('--bg-secondary', '#2d2d2d');
      document.documentElement.style.setProperty('--text-primary', '#ffffff');
      document.documentElement.style.setProperty('--text-secondary', '#cccccc');
      document.documentElement.style.setProperty('--border-color', '#404040');
    } else {
      document.documentElement.style.setProperty('--bg-primary', '#ffffff');
      document.documentElement.style.setProperty('--bg-secondary', '#f8f9fa');
      document.documentElement.style.setProperty('--text-primary', '#333333');
      document.documentElement.style.setProperty('--text-secondary', '#666666');
      document.documentElement.style.setProperty('--border-color', '#e0e0e0');
    }
  }, [theme]);

  const toggleTheme = () => {
    setThemeState(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const value = {
    theme,
    toggleTheme,
    setTheme
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;