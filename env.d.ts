/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_LOGIN_BANNER?: string;
  readonly VITE_LOGIN_BANNER_SEVERITY?: 'info' | 'warn' | 'error' | 'success';
  readonly VITE_FILTER_COMPONENT_LINKING_ENABLED?: string;
  readonly VITE_DEMO_FEEDBACK_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
