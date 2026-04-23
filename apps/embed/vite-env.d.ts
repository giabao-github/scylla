/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WIDGET_URL: string;
  readonly VITE_DEMO_ORG_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
