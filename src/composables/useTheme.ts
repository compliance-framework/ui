import { ref, computed, onScopeDispose } from 'vue';

type Theme = 'light' | 'dark';
export type ThemeChangeDetail = { theme: Theme };

const THEME_STORAGE_KEY = 'theme';
const isClient = typeof window !== 'undefined';

const systemPreference = ref<Theme>('light');
const theme = ref<Theme>('light');
const isSystemTheme = ref(true);

let initialized = false;
let mediaQuery: MediaQueryList | null = null;
let removeMediaQueryListener: (() => void) | null = null;
let consumerCount = 0;

const applyThemeClass = (value: Theme) => {
  if (!isClient) return;
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

const dispatchThemeChange = (value: Theme) => {
  if (!isClient) return;
  window.dispatchEvent(
    new CustomEvent<ThemeChangeDetail>('theme-change', {
      detail: { theme: value },
    }),
  );
};

const updateTheme = (value: Theme) => {
  theme.value = value;
  applyThemeClass(value);
  persistThemeSelection();
  dispatchThemeChange(value);
};

const handleMediaQueryChange = (event: MediaQueryListEvent) => {
  systemPreference.value = event.matches ? 'dark' : 'light';
  if (isSystemTheme.value) {
    updateTheme(systemPreference.value);
  }
};

const initializeTheme = () => {
  if (initialized) {
    return;
  }

  if (!isClient) {
    initialized = true;
    return;
  }

  mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', handleMediaQueryChange);
  removeMediaQueryListener = () => {
    mediaQuery?.removeEventListener('change', handleMediaQueryChange);
    mediaQuery = null;
    removeMediaQueryListener = null;
    initialized = false;
  };

  systemPreference.value = mediaQuery.matches ? 'dark' : 'light';

  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
  if (storedTheme === 'light' || storedTheme === 'dark') {
    isSystemTheme.value = false;
    updateTheme(storedTheme);
  } else {
    isSystemTheme.value = true;
    updateTheme(systemPreference.value);
  }

  initialized = true;
};

const registerConsumer = () => {
  consumerCount += 1;
  onScopeDispose(() => {
    consumerCount = Math.max(consumerCount - 1, 0);
    if (consumerCount === 0 && removeMediaQueryListener) {
      removeMediaQueryListener();
    }
  });
};

export function useTheme() {
  initializeTheme();
  registerConsumer();

  const toggleTheme = () => {
    isSystemTheme.value = false;
    const nextTheme = theme.value === 'dark' ? 'light' : 'dark';
    updateTheme(nextTheme);
  };

  const useSystemValue = () => {
    isSystemTheme.value = true;
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
