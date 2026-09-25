import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import builtInConfig from '../defaultconfig.json';

export interface Config {
  API_URL: string;
  LOGIN_BANNER?: string;
  LOGIN_BANNER_SEVERITY?: LoginBannerSeverity;
  // Feature flag: allow filters (dashboards) to be linked to system components.
  FILTER_COMPONENT_LINKING_ENABLED?: boolean;
}

const loginBannerSeverities = ['info', 'warn', 'error', 'success'] as const;
export type LoginBannerSeverity = (typeof loginBannerSeverities)[number];

const defaultConfig = builtInConfig as Config;

function isLoginBannerSeverity(value: unknown): value is LoginBannerSeverity {
  return (
    typeof value === 'string' &&
    loginBannerSeverities.includes(value as LoginBannerSeverity)
  );
}

function parseBooleanEnv(value: string | undefined): boolean | undefined {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

function applyOverrides(cfg: Config): Config {
  return {
    ...cfg,
    FILTER_COMPONENT_LINKING_ENABLED:
      parseBooleanEnv(import.meta.env.VITE_FILTER_COMPONENT_LINKING_ENABLED) ??
      cfg.FILTER_COMPONENT_LINKING_ENABLED === true,
    LOGIN_BANNER:
      import.meta.env.VITE_LOGIN_BANNER !== undefined
        ? import.meta.env.VITE_LOGIN_BANNER
        : cfg.LOGIN_BANNER,
    LOGIN_BANNER_SEVERITY: isLoginBannerSeverity(
      import.meta.env.VITE_LOGIN_BANNER_SEVERITY,
    )
      ? import.meta.env.VITE_LOGIN_BANNER_SEVERITY
      : isLoginBannerSeverity(cfg.LOGIN_BANNER_SEVERITY)
        ? cfg.LOGIN_BANNER_SEVERITY
        : 'info',
  };
}

export const useConfigStore = defineStore('config', () => {
  const config = ref<Config>();
  const showLabels = ref<boolean>(true);
  const showHiddenLabels = ref<boolean>(false);

  async function getConfig(): Promise<Config> {
    if (config.value) {
      return config.value;
    }

    if (import.meta.env.VITE_API_URL) {
      config.value = applyOverrides({
        ...defaultConfig,
        API_URL: import.meta.env.VITE_API_URL,
      });
      return config.value;
    }

    const response = await fetch(
      window.location.origin + import.meta.env.BASE_URL + '/config.json',
    );
    let returnedConfig = {} as Config;
    if (response.ok) {
      try {
        returnedConfig = (await response.json()) as Config;
      } catch (e: unknown) {
        if (e instanceof SyntaxError) {
          console.error(
            'Unable to read the configuration response. Reverting to built-in config.',
          );
        } else {
          throw e;
        }
      }
    }
    config.value = applyOverrides({
      ...defaultConfig,
      ...returnedConfig,
    });
    return config.value;
  }

  const filterComponentLinkingEnabled = computed(
    () => config.value?.FILTER_COMPONENT_LINKING_ENABLED === true,
  );

  function toggleLabels() {
    showLabels.value = !showLabels.value;
  }

  function toggleHiddenLabels() {
    showHiddenLabels.value = !showHiddenLabels.value;
  }

  return {
    showLabels,
    showHiddenLabels,
    toggleLabels,
    toggleHiddenLabels,
    getConfig,
    filterComponentLinkingEnabled,
  };
});
