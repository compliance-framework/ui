import { ref, computed } from 'vue';

type Theme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'theme';
const isClient = typeof window !== 'undefined';

const systemPreference = ref<Theme>('light');
const theme = ref<Theme>('light');
const isSystemTheme = ref(true);

const applyThemeClass = (value: Theme, context: string) => {
  if (!isClient) return;
  console.log(`[theme] applyThemeClass -> ${value} (context: ${context})`);
  document.documentElement.classList.toggle('dark', value === 'dark');
};

const persistThemeSelection = () => {
  if (!isClient) return;
  if (isSystemTheme.value) {
    localStorage.removeItem(THEME_STORAGE_KEY);
  } else {
    localStorage.setItem(THEME_STORAGE_KEY, theme.value);
  }
};

const updateTheme = (value: Theme) => {
  console.log('[theme] updateTheme', {
    previous: theme.value,
    next: value,
    isSystemTheme: isSystemTheme.value,
  });
  theme.value = value;
  applyThemeClass(value, isSystemTheme.value ? 'system' : 'manual');
  persistThemeSelection();
};

const updateSystemPreference = () => {
  if (!isClient) return;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  systemPreference.value = prefersDark ? 'dark' : 'light';
  if (isSystemTheme.value) {
    updateTheme(systemPreference.value);
  }
};

if (isClient) {
  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  updateSystemPreference();

  if (storedTheme === 'light' || storedTheme === 'dark') {
    isSystemTheme.value = false;
    updateTheme(storedTheme);
  } else {
    isSystemTheme.value = true;
    updateTheme(systemPreference.value);
  }

  mediaQuery.addEventListener('change', () => {
    systemPreference.value = mediaQuery.matches ? 'dark' : 'light';
    if (isSystemTheme.value) {
      updateTheme(systemPreference.value);
    }
  });
} else {
  theme.value = 'light';
}

export function useTheme() {
  const toggleTheme = () => {
    isSystemTheme.value = false;
    const nextTheme = theme.value === 'dark' ? 'light' : 'dark';
    console.log('[theme] toggleTheme', { current: theme.value, nextTheme });
    updateTheme(nextTheme);
  };

  const useSystemValue = () => {
    isSystemTheme.value = true;
    console.log('[theme] useSystemValue', {
      systemPreference: systemPreference.value,
    });
    updateTheme(systemPreference.value);
  };

  const systemLabel = computed(
    () =>
      `${systemPreference.value.charAt(0).toUpperCase()}${systemPreference.value.slice(1)}`,
  );

  return {
    theme,
    systemPreference,
    systemLabel,
    isSystemTheme,
    toggleTheme,
    useSystemValue,
  };
}
