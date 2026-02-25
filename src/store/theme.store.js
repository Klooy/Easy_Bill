import { create } from 'zustand';

const getInitialTheme = () => {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem('easybill-theme');
  if (stored === 'dark' || stored === 'light') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const applyTheme = (theme) => {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  localStorage.setItem('easybill-theme', theme);
};

const useThemeStore = create((set, get) => ({
  theme: getInitialTheme(),

  initialize: () => {
    const theme = get().theme;
    applyTheme(theme);
  },

  toggleTheme: () => {
    const newTheme = get().theme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
    set({ theme: newTheme });
  },

  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },

  isDark: () => get().theme === 'dark',
}));

export { useThemeStore };
