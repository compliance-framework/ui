/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_LOGIN_BANNER?: string;
  readonly VITE_LOGIN_BANNER_SEVERITY?:
    | 'info'
    | 'warn'
    | 'error'
    | 'success';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
